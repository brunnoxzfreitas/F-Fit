import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

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
    bio TEXT,
    photo TEXT,
    instructorId INTEGER,
    studentLimit INTEGER DEFAULT 20
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

  CREATE TABLE IF NOT EXISTS workout_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    workoutId INTEGER,
    dayIndex INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    feeling TEXT NOT NULL,
    pain TEXT,
    notes TEXT,
    date TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(workoutId) REFERENCES completed_workouts(id)
  );

  CREATE TABLE IF NOT EXISTS physical_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    weight REAL,
    height REAL,
    waist REAL,
    chest REAL,
    arm REAL,
    thigh REAL,
    bodyFat REAL,
    notes TEXT,
    date TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id)
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
  db.exec("ALTER TABLE users ADD COLUMN instructorId INTEGER");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE users ADD COLUMN studentLimit INTEGER DEFAULT 20");
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
    CREATE INDEX IF NOT EXISTS idx_workout_feedback_user ON workout_feedback(userId);
    CREATE INDEX IF NOT EXISTS idx_physical_assessments_user ON physical_assessments(userId);
    CREATE INDEX IF NOT EXISTS idx_workout_plans_student ON workout_plans(studentId);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_instructor ON users(instructorId);
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

const firstInstructor = db.prepare("SELECT id FROM users WHERE type = 'instrutor' ORDER BY id LIMIT 1").get() as { id: number } | undefined;
if (firstInstructor) {
  db.prepare("UPDATE users SET studentLimit = COALESCE(studentLimit, 20) WHERE type = 'instrutor'").run();
  db.prepare("UPDATE users SET instructorId = ? WHERE type = 'aluno' AND instructorId IS NULL").run(firstInstructor.id);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? crypto.randomBytes(48).toString('hex') : 'dev-secret');
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('JWT_SECRET não configurado; usando segredo temporário em memória.');
  }

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
  const allowedOrigins = (process.env.CORS_ORIGIN || 'https://brunnoxzfreitas.github.io,http://localhost:3000,http://localhost:3001,http://localhost:3002')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origem não permitida pelo CORS'));
    }
  }));
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
      const token = jwt.sign({ id: user.id, type: user.type }, jwtSecret, { expiresIn: '7d' });
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
      const decoded = jwt.verify(token, jwtSecret) as any;
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

  const canAccessStudent = (requester: { id: number, type: string }, studentId: number) => {
    if (requester.type === 'admin') return true;
    if (requester.type === 'aluno') return requester.id === studentId;
    if (requester.type === 'instrutor') {
      const student = db.prepare("SELECT id FROM users WHERE id = ? AND type = 'aluno' AND instructorId = ?").get(studentId, requester.id);
      return Boolean(student);
    }
    return false;
  };

  const requireStudentAccess = (studentId: number, req: express.Request, res: express.Response) => {
    const requester = (req as any).user as { id: number, type: string };
    if (!canAccessStudent(requester, Number(studentId))) {
      res.status(403).json({ error: 'Acesso negado para este aluno' });
      return false;
    }
    return true;
  };

  // Users
  app.get("/api/users", authenticate, requireRole(['admin', 'instrutor']), (req, res) => {
    try {
      const requester = (req as any).user as { id: number, type: string };
      const users = requester.type === 'admin'
        ? db.prepare("SELECT id,name,email,type,age,objective,bio,photo,role,permissions,instructorId,studentLimit FROM users").all()
        : db.prepare("SELECT id,name,email,type,age,objective,bio,photo,role,permissions,instructorId,studentLimit FROM users WHERE type = 'aluno' AND instructorId = ?").all(requester.id);
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  });

  app.post("/api/users", authenticate, (req, res) => {
    const { name, email, password, type, age, objective, bio } = req.body;
    const studentLimit = Number(req.body.studentLimit) || 20;
    const requestedInstructorId = req.body.instructorId ? Number(req.body.instructorId) : null;
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
      let info;
      if (type === 'aluno') {
        const instructorId = creator?.type === 'instrutor' ? creator.id : requestedInstructorId;
        if (!instructorId) return res.status(400).json({ error: 'Selecione um instrutor responsÃ¡vel pelo aluno.' });
        const instructor = db.prepare("SELECT id, studentLimit FROM users WHERE id = ? AND type = 'instrutor'").get(instructorId) as { id: number, studentLimit: number | null } | undefined;
        if (!instructor) return res.status(400).json({ error: 'Instrutor invÃ¡lido.' });
        const currentStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE type = 'aluno' AND instructorId = ?").get(instructorId) as { count: number };
        const limit = instructor.studentLimit ?? 20;
        if (currentStudents.count >= limit) return res.status(400).json({ error: `Este instrutor jÃ¡ atingiu o limite de ${limit} alunos.` });
        const stmt = db.prepare("INSERT INTO users (name, email, password, type, age, objective, bio, instructorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        info = stmt.run(name, email, hashed, type, age, objective, bio, instructorId);
      } else {
        const stmt = db.prepare("INSERT INTO users (name, email, password, type, age, objective, bio, studentLimit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        info = stmt.run(name, email, hashed, type, age, objective, bio, Math.max(1, studentLimit));
      }
      const newUser = db.prepare("SELECT id,name,email,type,age,objective,bio,photo,role,permissions,instructorId,studentLimit FROM users WHERE id = ?").get(info.lastInsertRowid);
      res.json(newUser);
    } catch (error: any) {
      res.status(400).json({ error: "Email já cadastrado" });
    }
  });

  app.put("/api/users/:id", authenticate, upload.single('photo'), (req, res) => {
    const userId = req.params.id;
    const requester = (req as any).user as { id: number, type: string };
    if (requester.type !== 'admin' && requester.id !== Number(userId)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
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
      
      const updatedUser = db.prepare("SELECT id,name,email,type,age,objective,bio,photo,role,permissions,instructorId,studentLimit FROM users WHERE id = ?").get(userId);
      res.json(updatedUser);
    } catch (error: any) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Email já está em uso' });
      } else {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
      }
    }
  });

  app.patch("/api/users/:id/admin", authenticate, requireRole(['admin']), (req, res) => {
    const userId = Number(req.params.id);
    const { studentLimit, instructorId } = req.body;

    try {
      const target = db.prepare("SELECT id,type,instructorId FROM users WHERE id = ?").get(userId) as { id: number, type: string, instructorId: number | null } | undefined;
      if (!target) return res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });

      if (target.type === 'instrutor') {
        const limit = Math.max(1, Number(studentLimit) || 1);
        const currentStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE type = 'aluno' AND instructorId = ?").get(userId) as { count: number };
        if (limit < currentStudents.count) {
          return res.status(400).json({ error: `Este instrutor jÃ¡ tem ${currentStudents.count} alunos. O limite nÃ£o pode ser menor que isso.` });
        }
        db.prepare("UPDATE users SET studentLimit = ? WHERE id = ?").run(limit, userId);
      }

      if (target.type === 'aluno' && instructorId !== undefined) {
        const nextInstructorId = Number(instructorId);
        const instructor = db.prepare("SELECT id, studentLimit FROM users WHERE id = ? AND type = 'instrutor'").get(nextInstructorId) as { id: number, studentLimit: number | null } | undefined;
        if (!instructor) return res.status(400).json({ error: 'Instrutor invÃ¡lido.' });
        const currentStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE type = 'aluno' AND instructorId = ? AND id != ?").get(nextInstructorId, userId) as { count: number };
        const limit = instructor.studentLimit ?? 20;
        if (currentStudents.count >= limit) return res.status(400).json({ error: `Este instrutor jÃ¡ atingiu o limite de ${limit} alunos.` });
        db.prepare("UPDATE users SET instructorId = ? WHERE id = ?").run(nextInstructorId, userId);
      }

      const updatedUser = db.prepare("SELECT id,name,email,type,age,objective,bio,photo,role,permissions,instructorId,studentLimit FROM users WHERE id = ?").get(userId);
      res.json(updatedUser);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao atualizar limite.' });
    }
  });

  app.put("/api/users/:id/photo", authenticate, upload.single('photo'), (req, res) => {
    const userId = req.params.id;
    const requester = (req as any).user as { id: number, type: string };
    if (requester.type !== 'admin' && requester.id !== Number(userId)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const photoPath = `/uploads/${req.file.filename}`;
    try {
      const stmt = db.prepare("UPDATE users SET photo = ? WHERE id = ?");
      stmt.run(photoPath, userId);
      const updatedUser = db.prepare("SELECT id,name,email,type,age,objective,bio,photo,role,permissions,instructorId,studentLimit FROM users WHERE id = ?").get(userId);
      res.json(updatedUser);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao atualizar foto' });
    }
  });

  app.delete("/api/users/:id", authenticate, (req, res) => {
    const userId = req.params.id;
    try {
      const requester = (req as any).user as { id: number, type: string };
      const target = db.prepare("SELECT id,type,instructorId FROM users WHERE id = ?").get(userId) as { id: number, type: string, instructorId: number | null } | undefined;
      if (!target) return res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });
      if (requester.type !== 'admin' && !(requester.type === 'instrutor' && target.type === 'aluno' && target.instructorId === requester.id)) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      if (target.type === 'instrutor') {
        const assignedStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE type = 'aluno' AND instructorId = ?").get(userId) as { count: number };
        if (assignedStudents.count > 0) {
          return res.status(400).json({ error: 'Este instrutor ainda possui alunos vinculados.' });
        }
      }
      db.transaction(() => {
        db.prepare("DELETE FROM workout_plans WHERE studentId = ?").run(userId);
        db.prepare("DELETE FROM physical_assessments WHERE userId = ?").run(userId);
        db.prepare("DELETE FROM workout_feedback WHERE userId = ?").run(userId);
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
  app.get("/api/completed-workouts", authenticate, (req, res) => {
    const requester = (req as any).user as { id: number, type: string };
    const workouts = requester.type === 'admin'
      ? db.prepare("SELECT * FROM completed_workouts").all()
      : requester.type === 'instrutor'
        ? db.prepare(`
            SELECT cw.* FROM completed_workouts cw
            JOIN users u ON u.id = cw.userId
            WHERE u.instructorId = ?
          `).all(requester.id)
        : db.prepare("SELECT * FROM completed_workouts WHERE userId = ?").all(requester.id);
    res.json(workouts);
  });

  app.post("/api/completed-workouts", authenticate, (req, res) => {
    const { userId, dayIndex, date } = req.body;
    if (!requireStudentAccess(Number(userId), req, res)) return;
    const stmt = db.prepare("INSERT INTO completed_workouts (userId, dayIndex, date) VALUES (?, ?, ?)");
    const info = stmt.run(userId, dayIndex, date);
    const newWorkout = db.prepare("SELECT * FROM completed_workouts WHERE id = ?").get(info.lastInsertRowid);
    res.json(newWorkout);
  });

  app.delete("/api/completed-workouts/:id", authenticate, (req, res) => {
    const workout = db.prepare("SELECT userId FROM completed_workouts WHERE id = ?").get(req.params.id) as { userId: number } | undefined;
    if (!workout) return res.status(404).json({ error: 'Treino não encontrado' });
    if (!requireStudentAccess(workout.userId, req, res)) return;
    db.prepare("DELETE FROM completed_workouts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Workout Feedback
  app.get("/api/workout-feedback", authenticate, (req, res) => {
    try {
      const requester = (req as any).user as { id: number, type: string };
      const feedback = requester.type === 'admin'
        ? db.prepare("SELECT * FROM workout_feedback ORDER BY date DESC").all()
        : requester.type === 'instrutor'
          ? db.prepare(`
              SELECT wf.* FROM workout_feedback wf
              JOIN users u ON u.id = wf.userId
              WHERE u.instructorId = ?
              ORDER BY wf.date DESC
            `).all(requester.id)
          : db.prepare("SELECT * FROM workout_feedback WHERE userId = ? ORDER BY date DESC").all(requester.id);
      res.json(feedback);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao buscar feedbacks' });
    }
  });

  app.post("/api/workout-feedback", authenticate, (req, res) => {
    try {
      const { userId, workoutId, dayIndex, difficulty, feeling, pain, notes, date } = req.body;
      if (!requireStudentAccess(Number(userId), req, res)) return;
      const stmt = db.prepare(`
        INSERT INTO workout_feedback (userId, workoutId, dayIndex, difficulty, feeling, pain, notes, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(userId, workoutId || null, dayIndex, difficulty, feeling, pain || '', notes || '', date);
      const newFeedback = db.prepare("SELECT * FROM workout_feedback WHERE id = ?").get(info.lastInsertRowid);
      res.json(newFeedback);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao salvar feedback' });
    }
  });

  app.delete("/api/workout-feedback/:id", authenticate, (req, res) => {
    try {
      const feedback = db.prepare("SELECT userId FROM workout_feedback WHERE id = ?").get(req.params.id) as { userId: number } | undefined;
      if (!feedback) return res.status(404).json({ error: 'Feedback não encontrado' });
      if (!requireStudentAccess(feedback.userId, req, res)) return;
      db.prepare("DELETE FROM workout_feedback WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Erro ao deletar feedback' });
    }
  });

  // Physical Assessments
  app.get("/api/physical-assessments", authenticate, (req, res) => {
    try {
      const requester = (req as any).user as { id: number, type: string };
      const assessments = requester.type === 'admin'
        ? db.prepare("SELECT * FROM physical_assessments ORDER BY date DESC").all()
        : requester.type === 'instrutor'
          ? db.prepare(`
              SELECT pa.* FROM physical_assessments pa
              JOIN users u ON u.id = pa.userId
              WHERE u.instructorId = ?
              ORDER BY pa.date DESC
            `).all(requester.id)
          : db.prepare("SELECT * FROM physical_assessments WHERE userId = ? ORDER BY date DESC").all(requester.id);
      res.json(assessments);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao buscar avaliações físicas' });
    }
  });

  app.post("/api/physical-assessments", authenticate, (req, res) => {
    try {
      const { userId, weight, height, waist, chest, arm, thigh, bodyFat, notes, date } = req.body;
      if (!requireStudentAccess(Number(userId), req, res)) return;
      const stmt = db.prepare(`
        INSERT INTO physical_assessments (userId, weight, height, waist, chest, arm, thigh, bodyFat, notes, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(userId, weight || null, height || null, waist || null, chest || null, arm || null, thigh || null, bodyFat || null, notes || '', date);
      const assessment = db.prepare("SELECT * FROM physical_assessments WHERE id = ?").get(info.lastInsertRowid);
      res.json(assessment);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao salvar avaliação física' });
    }
  });

  app.delete("/api/physical-assessments/:id", authenticate, (req, res) => {
    try {
      const assessment = db.prepare("SELECT userId FROM physical_assessments WHERE id = ?").get(req.params.id) as { userId: number } | undefined;
      if (!assessment) return res.status(404).json({ error: 'Avaliação não encontrada' });
      if (!requireStudentAccess(assessment.userId, req, res)) return;
      db.prepare("DELETE FROM physical_assessments WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Erro ao deletar avaliação física' });
    }
  });

  // Workout Logs (Exercises completed with reps and weight)
  app.get("/api/workout-logs", authenticate, (req, res) => {
    try {
      const requester = (req as any).user as { id: number, type: string };
      const baseQuery = `
        SELECT wl.*, e.name as exerciseName
        FROM workout_logs wl
        JOIN exercises e ON wl.exerciseId = e.id
      `;
      const logs = requester.type === 'admin'
        ? db.prepare(`${baseQuery} ORDER BY wl.date DESC`).all()
        : requester.type === 'instrutor'
          ? db.prepare(`
              ${baseQuery}
              JOIN users u ON u.id = wl.userId
              WHERE u.instructorId = ?
              ORDER BY wl.date DESC
            `).all(requester.id)
          : db.prepare(`${baseQuery} WHERE wl.userId = ? ORDER BY wl.date DESC`).all(requester.id);
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao buscar logs' });
    }
  });

  app.post("/api/workout-logs", authenticate, (req, res) => {
    try {
      const { userId, exerciseId, reps, weight, sets, notes, date } = req.body;
      if (!requireStudentAccess(Number(userId), req, res)) return;
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
      const log = db.prepare("SELECT userId FROM workout_logs WHERE id = ?").get(req.params.id) as { userId: number } | undefined;
      if (!log) return res.status(404).json({ error: 'Log não encontrado' });
      if (!requireStudentAccess(log.userId, req, res)) return;
      db.prepare("DELETE FROM workout_logs WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Erro ao deletar log' });
    }
  });

  // Workout Plans
  app.get("/api/workout-plans", authenticate, (req, res) => {
    const requester = (req as any).user as { id: number, type: string };
    const baseQuery = `
      SELECT wp.*, e.name as exerciseName, e.video, e.videoType, e.description
      FROM workout_plans wp
      JOIN exercises e ON wp.exerciseId = e.id
    `;
    const plans = requester.type === 'admin'
      ? db.prepare(baseQuery).all()
      : requester.type === 'instrutor'
        ? db.prepare(`
            ${baseQuery}
            JOIN users u ON u.id = wp.studentId
            WHERE u.instructorId = ?
          `).all(requester.id)
        : db.prepare(`${baseQuery} WHERE wp.studentId = ?`).all(requester.id);
    res.json(plans);
  });

  app.post("/api/workout-plans", authenticate, requireRole(['admin','instrutor']), (req, res) => {
    try {
      const { studentId, dayIndex, exerciseId, targetReps, targetWeight } = req.body;
      if (!requireStudentAccess(Number(studentId), req, res)) return;
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

  app.delete("/api/workout-plans/:id", authenticate, requireRole(['admin','instrutor']), (req, res) => {
    const plan = db.prepare("SELECT studentId FROM workout_plans WHERE id = ?").get(req.params.id) as { studentId: number } | undefined;
    if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
    if (!requireStudentAccess(plan.studentId, req, res)) return;
    db.prepare("DELETE FROM workout_plans WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/workout-plans/student/:studentId", authenticate, requireRole(['admin','instrutor']), (req, res) => {
    if (!requireStudentAccess(Number(req.params.studentId), req, res)) return;
    db.prepare("DELETE FROM workout_plans WHERE studentId = ?").run(req.params.studentId);
    res.json({ success: true });
  });

  // Workout Sessions
  app.post("/api/workout-sessions", authenticate, (req, res) => {
    try {
      const { userId, startTime } = req.body;
      if (!requireStudentAccess(Number(userId), req, res)) return;
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
      const session = db.prepare("SELECT userId,startTime FROM workout_sessions WHERE id = ?").get(req.params.id) as { userId: number, startTime: string } | undefined;
      if (!session) return res.status(404).json({ error: "Sessão não encontrada" });
      if (!requireStudentAccess(session.userId, req, res)) return;
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
      const requester = (req as any).user as { id: number, type: string };
      const sessions = requester.type === 'admin'
        ? db.prepare("SELECT * FROM workout_sessions ORDER BY date DESC").all()
        : requester.type === 'instrutor'
          ? db.prepare(`
              SELECT ws.* FROM workout_sessions ws
              JOIN users u ON u.id = ws.userId
              WHERE u.instructorId = ?
              ORDER BY ws.date DESC
            `).all(requester.id)
          : db.prepare("SELECT * FROM workout_sessions WHERE userId = ? ORDER BY date DESC").all(requester.id);
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
