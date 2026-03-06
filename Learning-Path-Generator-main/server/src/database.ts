import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'user_data.db');

let db: SqlJsDatabase;

function saveDb(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      secret_question TEXT,
      secret_answer TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS learning_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      topic TEXT NOT NULL,
      path_data TEXT NOT NULL,
      total_duration_text TEXT,
      FOREIGN KEY (username) REFERENCES users (username)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      rating INTEGER NOT NULL,
      UNIQUE(path_id, username),
      FOREIGN KEY (path_id) REFERENCES learning_paths (id),
      FOREIGN KEY (username) REFERENCES users (username)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS task_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      path_id INTEGER NOT NULL,
      task_identifier TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      UNIQUE(username, path_id, task_identifier),
      FOREIGN KEY (username) REFERENCES users (username),
      FOREIGN KEY (path_id) REFERENCES learning_paths (id)
    )
  `);

  saveDb();
}

// --- User Management ---
export function addUser(
  username: string,
  hashedPassword: string,
  question: string,
  hashedAnswer: string
): boolean {
  try {
    db.run(
      'INSERT INTO users (username, password, secret_question, secret_answer) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, question, hashedAnswer]
    );
    saveDb();
    return true;
  } catch {
    return false;
  }
}

export function getUser(username: string): { username: string; password: string } | undefined {
  const stmt = db.prepare('SELECT username, password FROM users WHERE username = ?');
  stmt.bind([username]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as { username: string; password: string };
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function userExists(username: string): boolean {
  const stmt = db.prepare('SELECT username FROM users WHERE username = ?');
  stmt.bind([username]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

// --- Password Reset ---
export function getSecretQuestion(username: string): string | null {
  const stmt = db.prepare('SELECT secret_question FROM users WHERE username = ?');
  stmt.bind([username]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as { secret_question: string };
    stmt.free();
    return row.secret_question;
  }
  stmt.free();
  return null;
}

export function getSecretAnswer(username: string): string | null {
  const stmt = db.prepare('SELECT secret_answer FROM users WHERE username = ?');
  stmt.bind([username]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as { secret_answer: string };
    stmt.free();
    return row.secret_answer;
  }
  stmt.free();
  return null;
}

export function resetPassword(username: string, hashedPassword: string): void {
  db.run('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username]);
  saveDb();
}

// --- Learning Path Management ---
export function savePath(
  username: string,
  topic: string,
  pathData: string,
  totalDurationText: string
): number {
  db.run(
    'INSERT INTO learning_paths (username, topic, path_data, total_duration_text) VALUES (?, ?, ?, ?)',
    [username, topic, pathData, totalDurationText]
  );
  saveDb();

  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const row = stmt.getAsObject() as { id: number };
  stmt.free();
  return row.id;
}

export interface LearningPathRow {
  id: number;
  topic: string;
  path_data: string;
  total_duration_text: string;
}

export function getUserPaths(username: string): LearningPathRow[] {
  const stmt = db.prepare(
    'SELECT id, topic, path_data, total_duration_text FROM learning_paths WHERE username = ?'
  );
  stmt.bind([username]);

  const results: LearningPathRow[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as LearningPathRow);
  }
  stmt.free();
  return results;
}

export function updatePathData(pathId: number, newPathData: string): void {
  db.run('UPDATE learning_paths SET path_data = ? WHERE id = ?', [newPathData, pathId]);
  saveDb();
}

// --- Feedback Management ---
export function addFeedback(pathId: number, username: string, rating: number): void {
  db.run(
    'INSERT OR REPLACE INTO feedback (path_id, username, rating) VALUES (?, ?, ?)',
    [pathId, username, rating]
  );
  saveDb();
}

export function getFeedback(pathId: number, username: string): number | null {
  const stmt = db.prepare('SELECT rating FROM feedback WHERE path_id = ? AND username = ?');
  stmt.bind([pathId, username]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as { rating: number };
    stmt.free();
    return row.rating;
  }
  stmt.free();
  return null;
}

// --- Task Progress ---
export function updateTaskStatus(
  username: string,
  pathId: number,
  taskIdentifier: string,
  completed: boolean
): void {
  const status = completed ? 1 : 0;
  db.run(
    'INSERT OR REPLACE INTO task_progress (username, path_id, task_identifier, completed) VALUES (?, ?, ?, ?)',
    [username, pathId, taskIdentifier, status]
  );
  saveDb();
}

export function getTaskStatusesForPath(
  username: string,
  pathId: number
): Record<string, number> {
  const stmt = db.prepare(
    'SELECT task_identifier, completed FROM task_progress WHERE username = ? AND path_id = ?'
  );
  stmt.bind([username, pathId]);

  const statuses: Record<string, number> = {};
  while (stmt.step()) {
    const row = stmt.getAsObject() as { task_identifier: string; completed: number };
    statuses[row.task_identifier] = row.completed;
  }
  stmt.free();
  return statuses;
}

// --- Admin ---
export interface FeedbackDetail {
  username: string;
  topic: string;
  rating: number;
}

export function getAllFeedbackWithDetails(): FeedbackDetail[] {
  const stmt = db.prepare(
    `SELECT f.username, lp.topic, f.rating
     FROM feedback f JOIN learning_paths lp ON f.path_id = lp.id`
  );

  const results: FeedbackDetail[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as FeedbackDetail);
  }
  stmt.free();
  return results;
}
