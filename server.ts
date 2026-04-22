import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import multer from "multer";
import path from "path";
import fs from "fs";

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
const upload = multer({ storage: storage });

const db = new Database("ffit.db");

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

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (name, email, password, type, age, objective, role, permissions, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  insertUser.run("João Silva", "joao@email.com", "123456", "aluno", 25, "hipertrofia", null, null, null);
  insertUser.run("Maria Santos", "maria@email.com", "123456", "instrutor", 30, null, null, null, "Especialista em hipertrofia e emagrecimento.");
  insertUser.run("Administrador F-fit", "admin@ffit.com", "admin123", "admin", 35, null, "Super Administrador", '["all"]', null);
  
  const insertExercise = db.prepare("INSERT INTO exercises (name, muscleGroup, description, video, videoType) VALUES (?, ?, ?, ?, ?)");
  insertExercise.run("Supino Reto", "peito", "Exercício para desenvolvimento do peitoral superior", "https://www.youtube.com/embed/0G2_XV7slIg", "url");
  insertExercise.run("Agachamento", "pernas", "Exercício fundamental para quadríceps e glúteos", "https://www.youtube.com/embed/0tn5K9NlCfo", "url");
  insertExercise.run("Remada Curvada", "costas", "Exercício para fortalecimento dos dorsais", "https://www.youtube.com/embed/G8l_8chR5BE", "url");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));

  // --- API ROUTES ---

  // Login
  app.post("/api/login", (req, res) => {
    const { email, password, type } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ? AND type = ?").get(email, password, type);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Credenciais inválidas" });
    }
  });

  // Users
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { name, email, password, type, age, objective, bio, requesterId } = req.body;

    // Security Check: Only admins can create instructors or other admins
    if (type === 'admin' || type === 'instrutor') {
      if (!requesterId) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem criar este tipo de usuário." });
      }
      const requester = db.prepare("SELECT type FROM users WHERE id = ?").get(requesterId) as { type: string } | undefined;
      if (!requester || requester.type !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem criar este tipo de usuário." });
      }
    }

    try {
      const stmt = db.prepare("INSERT INTO users (name, email, password, type, age, objective, bio) VALUES (?, ?, ?, ?, ?, ?, ?)");
      const info = stmt.run(name, email, password, type, age, objective, bio);
      const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      res.json(newUser);
    } catch (error) {
      res.status(400).json({ error: "Email já cadastrado" });
    }
  });

  app.put("/api/users/:id", upload.single('photo'), (req, res) => {
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
          stmt = db.prepare("UPDATE users SET name = ?, email = ?, password = ?, objective = ?, bio = ?, photo = ? WHERE id = ?");
          params = [name, email, password, objective, bio, photoPath, userId];
        } else {
          stmt = db.prepare("UPDATE users SET name = ?, email = ?, objective = ?, bio = ?, photo = ? WHERE id = ?");
          params = [name, email, objective, bio, photoPath, userId];
        }
      } else {
        // No photo upload
        if (password && password.trim() !== '') {
          stmt = db.prepare("UPDATE users SET name = ?, email = ?, password = ?, objective = ?, bio = ? WHERE id = ?");
          params = [name, email, password, objective, bio, userId];
        } else {
          stmt = db.prepare("UPDATE users SET name = ?, email = ?, objective = ?, bio = ? WHERE id = ?");
          params = [name, email, objective, bio, userId];
        }
      }
      
      stmt.run(...params);
      
      const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      res.json(updatedUser);
    } catch (error: any) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Email já está em uso' });
      } else {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
      }
    }
  });

  app.put("/api/users/:id/photo", upload.single('photo'), (req, res) => {
    const userId = req.params.id;
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    const photoPath = `/uploads/${req.file.filename}`;
    const stmt = db.prepare("UPDATE users SET photo = ? WHERE id = ?");
    stmt.run(photoPath, userId);
    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json(updatedUser);
  });

  app.delete("/api/users/:id", (req, res) => {
    const userId = req.params.id;
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM workout_plans WHERE studentId = ?").run(userId);
        db.prepare("DELETE FROM workout_logs WHERE userId = ?").run(userId);
        db.prepare("DELETE FROM completed_workouts WHERE userId = ?").run(userId);
        db.prepare("DELETE FROM users WHERE id = ?").run(userId);
      })();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir usuário e seus dados." });
    }
  });

  app.put("/api/users/:id/photo", upload.single('photo'), (req, res) => {
    const userId = req.params.id;
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    const photoPath = `/uploads/${req.file.filename}`;
    const stmt = db.prepare("UPDATE users SET photo = ? WHERE id = ?");
    stmt.run(photoPath, userId);
    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json(updatedUser);
  });

  // Exercises
  app.get("/api/exercises", (req, res) => {
    const exercises = db.prepare("SELECT * FROM exercises").all();
    res.json(exercises);
  });

  app.post("/api/exercises", upload.single('videoFile'), (req, res) => {
    const { name, muscleGroup, description, videoUrl, videoType } = req.body;
    let finalVideo = videoUrl;
    if (req.file) {
      finalVideo = `/uploads/${req.file.filename}`;
    }
    const stmt = db.prepare("INSERT INTO exercises (name, muscleGroup, description, video, videoType) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(name, muscleGroup, description, finalVideo, videoType);
    const newEx = db.prepare("SELECT * FROM exercises WHERE id = ?").get(info.lastInsertRowid);
    res.json(newEx);
  });

  app.put("/api/exercises/:id", upload.single('videoFile'), (req, res) => {
    const { name, muscleGroup, description, videoUrl, videoType } = req.body;
    let finalVideo = videoUrl;
    if (req.file) {
      finalVideo = `/uploads/${req.file.filename}`;
    }
    const stmt = db.prepare("UPDATE exercises SET name = ?, muscleGroup = ?, description = ?, video = ?, videoType = ? WHERE id = ?");
    stmt.run(name, muscleGroup, description, finalVideo, videoType, req.params.id);
    const updatedEx = db.prepare("SELECT * FROM exercises WHERE id = ?").get(req.params.id);
    res.json(updatedEx);
  });

  app.delete("/api/exercises/:id", (req, res) => {
    db.prepare("DELETE FROM exercises WHERE id = ?").run(req.params.id);
    res.json({ success: true });
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
  app.get("/api/workout-logs", (req, res) => {
    const logs = db.prepare(`
      SELECT wl.*, e.name as exerciseName 
      FROM workout_logs wl 
      JOIN exercises e ON wl.exerciseId = e.id
      ORDER BY wl.date DESC
    `).all();
    res.json(logs);
  });

  app.post("/api/workout-logs", (req, res) => {
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
  });

  app.delete("/api/workout-logs/:id", (req, res) => {
    console.log(`Deleting workout log: ${req.params.id}`);
    db.prepare("DELETE FROM workout_logs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
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

  app.post("/api/workout-plans", (req, res) => {
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
  app.post("/api/workout-sessions", (req, res) => {
    const { userId, startTime } = req.body;
    const date = new Date(startTime).toISOString().split('T')[0];
    const stmt = db.prepare("INSERT INTO workout_sessions (userId, startTime, date) VALUES (?, ?, ?)");
    const info = stmt.run(userId, startTime, date);
    const newSession = db.prepare("SELECT * FROM workout_sessions WHERE id = ?").get(info.lastInsertRowid);
    res.json(newSession);
  });

  app.put("/api/workout-sessions/:id", (req, res) => {
    const { endTime, sessionNotes } = req.body;
    const session = db.prepare("SELECT startTime FROM workout_sessions WHERE id = ?").get(req.params.id) as { startTime: string } | undefined;
    if (!session) {
      return res.status(404).json({ error: "Sessão não encontrada" });
    }
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
  });

  app.get("/api/workout-sessions", (req, res) => {
    const sessions = db.prepare("SELECT * FROM workout_sessions ORDER BY date DESC").all();
    res.json(sessions);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
