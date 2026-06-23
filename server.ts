import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Tipo de arquivo não permitido'));
};

const upload = multer({ storage: storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

const db = new Database("ffit.db");
// SQLite performance pragmas
try {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
} catch (e) {
  console.warn('Could not set pragmas', e);
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    type TEXT NOT NULL,
    age INTEGER,
    objective TEXT,
    role TEXT,
    permissions TEXT,
    bio TEXT
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    muscleGroup TEXT NOT NULL,
    description TEXT,
    video TEXT,
    videoType TEXT
  );

  CREATE TABLE IF NOT EXISTS completed_workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    dayIndex INTEGER NOT NULL,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workout_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    exerciseId INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL NOT NULL,
    sets INTEGER DEFAULT 1,
    notes TEXT,
    date TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(exerciseId) REFERENCES exercises(id)
  );

  CREATE TABLE IF NOT EXISTS workout_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT,
    totalDuration INTEGER,
    sessionNotes TEXT,
    date TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workout_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER NOT NULL,
    dayIndex INTEGER NOT NULL,
    exerciseId INTEGER NOT NULL,
    targetReps TEXT,
    targetWeight TEXT,
    FOREIGN KEY(studentId) REFERENCES users(id),
    FOREIGN KEY(exerciseId) REFERENCES exercises(id)
  );
`);

try {
  db.exec("ALTER TABLE users ADD COLUMN bio TEXT");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE users ADD COLUMN photo TEXT");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE workout_logs ADD COLUMN sets INTEGER DEFAULT 1");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE workout_logs ADD COLUMN notes TEXT");
} catch (e) {
  // Column might already exist
}

// Create indexes to improve performance
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workout_logs_user ON workout_logs(userId);
    CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(date);
    CREATE INDEX IF NOT EXISTS idx_workout_plans_student ON workout_plans(studentId);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
} catch (e) {
  // ignore
}

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (name, email, password, type, age, objective, role, permissions, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  insertUser.run("João Silva", "joao@email.com", bcrypt.hashSync("123456", 10), "aluno", 25, "hipertrofia", null, null, null);
  insertUser.run("Maria Santos", "maria@email.com", bcrypt.hashSync("123456", 10), "instrutor", 30, null, null, null, "Especialista em hipertrofia e emagrecimento.");
  insertUser.run("Administrador F-fit", "admin@ffit.com", bcrypt.hashSync("admin123", 10), "admin", 35, null, "Super Administrador", '["all"]', null);
  
  const insertExercise = db.prepare("INSERT INTO exercises (name, muscleGroup, description, video, videoType) VALUES (?, ?, ?, ?, ?)");
  insertExercise.run("Supino Reto", "peito", "Exercício para desenvolvimento do peitoral superior", "https://www.youtube.com/embed/0G2_XV7slIg", "url");
  insertExercise.run("Agachamento", "pernas", "Exercício fundamental para quadríceps e glúteos", "https://www.youtube.com/embed/0tn5K9NlCfo", "url");
  insertExercise.run("Remada Curvada", "costas", "Exercício para fortalecimento dos dorsais", "https://www.youtube.com/embed/G8l_8chR5BE", "url");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV === "production") {
    app.use(helmet());
  } else {
    app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    }));
  }
  app.use(cors());
  // Basic rate limiter
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
  app.use(limiter);
  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));

  // --- API ROUTES ---

  // Login
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user) return res.status(401).json({ success: false, message: "Credenciais inválidas" });
      const match = bcrypt.compareSync(password, user.password);
      if (!match) return res.status(401).json({ success: false, message: "Credenciais inválidas" });
      const { password: _p, ...safeUser } = user;
      const token = jwt.sign({ id: user.id, type: user.type }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
      res.json({ success: true, user: safeUser, token });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
  });

  // Authentication middleware
  const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Token ausente' });
    const token = auth.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
      (req as any).user = decoded;
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  };

  const requireRole = (roles: string[]) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = (req as any).user as { id: number, type: string } | undefined;
      if (!user) return res.status(401).json({ error: 'Não autenticado' });
      if (!roles.includes(user.type)) return res.status(403).json({ error: 'Acesso negado' });
      next();
    };
  };

  // Users
  app.get("/api/users", authenticate, requireRole(['admin', 'instrutor']), (req, res) => {
    try {
      const requester = (req as any).user as { id: number, type: string };
      const users = requester.type === 'admin'
        ? db.prepare("SELECT id,name,email,type,age,objective,bio,photo,role,permissions FROM users").all()
        : db.prepare("SELECT id,name,email,type,age,objective,bio,photo,role,permissions FROM users WHERE type = 'aluno'").all();
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  });

  app.post("/api/users", authenticate, (req, res) => {
    const { name, email, password, type, age, objective, bio } = req.body;
    const creator = (req as any).user as { id: number, type: string } | undefined;

    if (!type || type.trim() === '') return res.status(400).json({ error: 'Tipo de usuário é obrigatório.' });
    if (type === 'admin' || type === 'instrutor') {
      if (!creator || creator.type !== 'admin') return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar esse tipo.' });
    }
    if (type === 'aluno') {
      if (!creator || (creator.type !== 'admin' && creator.type !== 'instrutor')) return res.status(403).json({ error: 'Acesso negado. Apenas instrutores ou administradores podem criar alunos.' });
    }

    try {
      const hashed = bcrypt.hashSync(password, 10);
      const stmt = db.prepare("INSERT INTO users (name, email, password, type, age, objective, bio) VALUES (?, ?, ?, ?, ?, ?, ?)");
      const info = stmt.run(name, email, hashed, type, age, objective, bio);
      const newUser = db.prepare("SELECT id,name,email,type,age,objective,bio,photo,role,permissions FROM users WHERE id = ?").get(info.lastInsertRowid);
      res.json(newUser);
    } catch (error: any) {
      res.status(400).json({ error: "Email já cadastrado" });
    }
  });

  app.put("/api/users/:id", authenticate, upload.single('photo'), (req, res) => {
    const userId = req.params.id;
    
    // Handle both FormData and JSON
    const name = req.body.name || req.body.name;
    const email = req.body.email || req.body.email;
    const password = req.body.password || req.body.password;
    const objective = req.body.objective || req.body.objective;
    const bio = req.body.bio || req.body.bio;
    
    try {
      let stmt;
      let params;
      if (req.file) {
        // If photo uploaded, include it
        const photoPath = `/uploads/${req.file.filename}`;
        if (password && password.trim() !== '') {
          const hashed = bcrypt.hashSync(password, 10);
          stmt = db.prepare("UPDATE users SET name = ?, email = ?, password = ?, objective = ?, bio = ?, photo = ? WHERE id = ?");
          params = [name, email, hashed, objective, bio, photoPath, userId];
        } else {
          stmt = db.prepare("UPDATE users SET name = ?, email = ?, objective = ?, bio = ?, photo = ? WHERE id = ?");
          params = [name, email, objective, bio, photoPath, userId];
        }
      } else {
        // No photo upload
        if (password && password.trim() !== '') {
          const hashed = bcrypt.hashSync(password, 10);
          stmt = db.prepare("UPDATE users SET name = ?, email = ?, password = ?, objective = ?, bio = ? WHERE id = ?");
          params = [name, email, hashed, objective, bio, userId];
        } else {
          stmt = db.prepare("UPDATE users SET name = ?, email = ?, objective = ?, bio = ? WHERE id = ?");
          params = [name, email, objective, bio, userId];
        }
      }
      
      stmt.run(...params);
      
      const updatedUser = db.prepare("SELECT id,name,email,type,age,objective,bio,photo,role,permissions FROM users WHERE id = ?").get(userId);
      res.json(updatedUser);
    } catch (error: any) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Email já está em uso' });
      } else {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
      }
    }
  });

  app.put("/api/users/:id/photo", authenticate, upload.single('photo'), (req, res) => {
    const userId = req.params.id;
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const photoPath = `/uploads/${req.file.filename}`;
    try {
      const stmt = db.prepare("UPDATE users SET photo = ? WHERE id = ?");
      stmt.run(photoPath, userId);
      const updatedUser = db.prepare("SELECT id,name,email,type,age,objective,bio,photo,role,permissions FROM users WHERE id = ?").get(userId);
      res.json(updatedUser);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao atualizar foto' });
    }
  });

  app.delete("/api/users/:id", authenticate, (req, res) => {
    const userId = req.params.id;
    try {
      const requester = (req as any).user as { id: number, type: string };
      const target = db.prepare("SELECT id,type FROM users WHERE id = ?").get(userId) as { id: number, type: string } | undefined;
      if (!target) return res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });
      if (requester.type !== 'admin' && !(requester.type === 'instrutor' && target.type === 'aluno')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      db.transaction(() => {
        db.prepare("DELETE FROM workout_plans WHERE studentId = ?").run(userId);
        db.prepare("DELETE FROM workout_logs WHERE userId = ?").run(userId);
        db.prepare("DELETE FROM completed_workouts WHERE userId = ?").run(userId);
        db.prepare("DELETE FROM workout_sessions WHERE userId = ?").run(userId);
        db.prepare("DELETE FROM users WHERE id = ?").run(userId);
      })();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir usuário e seus dados." });
    }
  });
  // duplicate photo route removed

  // Exercises
  app.get("/api/exercises", (req, res) => {
    const exercises = db.prepare("SELECT * FROM exercises").all();
    res.json(exercises);
  });

  app.post("/api/exercises", authenticate, requireRole(['admin','instrutor']), upload.single('videoFile'), (req, res) => {
    try {
      const { name, muscleGroup, description, videoUrl, videoType } = req.body;
      let finalVideo = videoUrl;
      if (req.file) {
        finalVideo = `/uploads/${req.file.filename}`;
      }
      const stmt = db.prepare("INSERT INTO exercises (name, muscleGroup, description, video, videoType) VALUES (?, ?, ?, ?, ?)");
      const info = stmt.run(name, muscleGroup, description, finalVideo, videoType);
      const newEx = db.prepare("SELECT * FROM exercises WHERE id = ?").get(info.lastInsertRowid);
      res.json(newEx);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao criar exercício' });
    }
  });

  app.put("/api/exercises/:id", authenticate, requireRole(['admin','instrutor']), upload.single('videoFile'), (req, res) => {
    try {
      const { name, muscleGroup, description, videoUrl, videoType } = req.body;
      let finalVideo = videoUrl;
      if (req.file) {
        finalVideo = `/uploads/${req.file.filename}`;
      }
      const stmt = db.prepare("UPDATE exercises SET name = ?, muscleGroup = ?, description = ?, video = ?, videoType = ? WHERE id = ?");
      stmt.run(name, muscleGroup, description, finalVideo, videoType, req.params.id);
      const updatedEx = db.prepare("SELECT * FROM exercises WHERE id = ?").get(req.params.id);
      res.json(updatedEx);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao atualizar exercício' });
    }
  });

  app.delete("/api/exercises/:id", authenticate, requireRole(['admin','instrutor']), (req, res) => {
    try {
      db.prepare("DELETE FROM exercises WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Erro ao deletar exercício' });
    }
  });

  // Completed Workouts
  app.get("/api/completed-workouts", (req, res) => {
    const workouts = db.prepare("SELECT * FROM completed_workouts").all();
    res.json(workouts);
  });

  app.post("/api/completed-workouts", (req, res) => {
    const { userId, dayIndex, date } = req.body;
    const stmt = db.prepare("INSERT INTO completed_workouts (userId, dayIndex, date) VALUES (?, ?, ?)");
    const info = stmt.run(userId, dayIndex, date);
    const newWorkout = db.prepare("SELECT * FROM completed_workouts WHERE id = ?").get(info.lastInsertRowid);
    res.json(newWorkout);
  });

  app.delete("/api/completed-workouts/:id", (req, res) => {
    db.prepare("DELETE FROM completed_workouts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Workout Logs (Exercises completed with reps and weight)
  app.get("/api/workout-logs", authenticate, (req, res) => {
    try {
      const logs = db.prepare(`
        SELECT wl.*, e.name as exerciseName 
        FROM workout_logs wl 
        JOIN exercises e ON wl.exerciseId = e.id
        ORDER BY wl.date DESC
      `).all();
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao buscar logs' });
    }
  });

  app.post("/api/workout-logs", authenticate, (req, res) => {
    try {
      const { userId, exerciseId, reps, weight, sets, notes, date } = req.body;
      const stmt = db.prepare("INSERT INTO workout_logs (userId, exerciseId, reps, weight, sets, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?)");
      const info = stmt.run(userId, exerciseId, reps, weight, sets || 1, notes || '', date);
      const newLog = db.prepare(`
        SELECT wl.*, e.name as exerciseName 
        FROM workout_logs wl 
        JOIN exercises e ON wl.exerciseId = e.id 
        WHERE wl.id = ?
      `).get(info.lastInsertRowid);
      res.json(newLog);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao criar log' });
    }
  });

  app.delete("/api/workout-logs/:id", authenticate, (req, res) => {
    try {
      db.prepare("DELETE FROM workout_logs WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Erro ao deletar log' });
    }
  });

  // Workout Plans
  app.get("/api/workout-plans", (req, res) => {
    const plans = db.prepare(`
      SELECT wp.*, e.name as exerciseName, e.video, e.videoType, e.description
      FROM workout_plans wp 
      JOIN exercises e ON wp.exerciseId = e.id
    `).all();
    res.json(plans);
  });

  app.post("/api/workout-plans", authenticate, requireRole(['admin','instrutor']), (req, res) => {
    try {
      const { studentId, dayIndex, exerciseId, targetReps, targetWeight } = req.body;
      const stmt = db.prepare("INSERT INTO workout_plans (studentId, dayIndex, exerciseId, targetReps, targetWeight) VALUES (?, ?, ?, ?, ?)");
      const info = stmt.run(studentId, dayIndex, exerciseId, targetReps, targetWeight);
      const newPlan = db.prepare(`
        SELECT wp.*, e.name as exerciseName, e.video, e.videoType, e.description
        FROM workout_plans wp 
        JOIN exercises e ON wp.exerciseId = e.id 
        WHERE wp.id = ?
      `).get(info.lastInsertRowid);
      res.json(newPlan);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao criar plano' });
    }
  });

  app.delete("/api/workout-plans/:id", (req, res) => {
    console.log(`Deleting workout plan: ${req.params.id}`);
    db.prepare("DELETE FROM workout_plans WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/workout-plans/student/:studentId", (req, res) => {
    db.prepare("DELETE FROM workout_plans WHERE studentId = ?").run(req.params.studentId);
    res.json({ success: true });
  });

  // Workout Sessions
  app.post("/api/workout-sessions", authenticate, (req, res) => {
    try {
      const { userId, startTime } = req.body;
      const date = new Date(startTime).toISOString().split('T')[0];
      const stmt = db.prepare("INSERT INTO workout_sessions (userId, startTime, date) VALUES (?, ?, ?)");
      const info = stmt.run(userId, startTime, date);
      const newSession = db.prepare("SELECT * FROM workout_sessions WHERE id = ?").get(info.lastInsertRowid);
      res.json(newSession);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao criar sessão' });
    }
  });

  app.put("/api/workout-sessions/:id", authenticate, (req, res) => {
    try {
      const { endTime, sessionNotes } = req.body;
      const session = db.prepare("SELECT startTime FROM workout_sessions WHERE id = ?").get(req.params.id) as { startTime: string } | undefined;
      if (!session) return res.status(404).json({ error: "Sessão não encontrada" });
      let totalDuration = null;
      if (endTime) {
        const start = new Date(session.startTime).getTime();
        const end = new Date(endTime).getTime();
        totalDuration = Math.round((end - start) / 60000); // Duration in minutes
      }
      const stmt = db.prepare("UPDATE workout_sessions SET endTime = ?, totalDuration = ?, sessionNotes = ? WHERE id = ?");
      stmt.run(endTime, totalDuration, sessionNotes || '', req.params.id);
      const updatedSession = db.prepare("SELECT * FROM workout_sessions WHERE id = ?").get(req.params.id);
      res.json(updatedSession);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao atualizar sessão' });
    }
  });

  app.get("/api/workout-sessions", authenticate, (req, res) => {
    try {
      const sessions = db.prepare("SELECT * FROM workout_sessions ORDER BY date DESC").all();
      res.json(sessions);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao buscar sessões' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      try {
        const template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  // Serve built frontend in production
  if (process.env.NODE_ENV === "production") {
    const staticPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(staticPath)) {
      app.use(express.static(staticPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(staticPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
