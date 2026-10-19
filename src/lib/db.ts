import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { seedDatabase } from "./seed";

/**
 * 数据层：Node 24 内置的 node:sqlite（零原生依赖，单文件数据库）。
 * 通过 createRequire 加载，避免 Next 打包器尝试解析内置模块。
 */
const requireNative = createRequire(import.meta.url);
const { DatabaseSync } = requireNative("node:sqlite") as {
  DatabaseSync: new (p: string) => any;
};

export type DB = any;

/**
 * 数据库位置：
 * 1. 优先 HR_DB_PATH（容器里固定为 /app/data/hr.db，挂载磁盘）
 * 2. standalone 启动时 Next 会把 cwd 切到 .next/standalone，此时回退到项目根的 data/，
 *    避免每次重新构建（.next 被清空）就丢库
 */
function resolveDbPath(): string {
  if (process.env.HR_DB_PATH) return process.env.HR_DB_PATH;
  const cwd = process.cwd();
  const standaloneSuffix = path.join(".next", "standalone");
  const base = cwd.endsWith(standaloneSuffix) ? path.resolve(cwd, "..", "..") : cwd;
  return path.join(base, "data", "hr.db");
}

const DB_PATH = resolveDbPath();

const globalRef = globalThis as typeof globalThis & { __hrDb?: DB };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  head TEXT NOT NULL,
  target_headcount INTEGER NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  position TEXT NOT NULL,
  level TEXT NOT NULL,
  hire_date TEXT NOT NULL,
  status TEXT NOT NULL,
  contract_end TEXT,
  salary INTEGER,
  birth_date TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  headcount INTEGER NOT NULL,
  filled INTEGER NOT NULL DEFAULT 0,
  salary_min INTEGER,
  salary_max INTEGER,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  owner TEXT,
  created_at TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  name TEXT NOT NULL,
  phone TEXT,
  source TEXT NOT NULL,
  stage TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 3,
  applied_at TEXT NOT NULL,
  hired_at TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS interviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id),
  round INTEGER NOT NULL,
  scheduled_at TEXT NOT NULL,
  interviewer TEXT NOT NULL,
  mode TEXT NOT NULL,
  result TEXT,
  feedback TEXT
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  mandatory INTEGER NOT NULL DEFAULT 0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  score INTEGER,
  assigned_at TEXT NOT NULL,
  due_date TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  work_date TEXT NOT NULL,
  shift TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  UNIQUE(employee_id, work_date)
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  work_date TEXT NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  status TEXT NOT NULL,
  UNIQUE(employee_id, work_date)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  period TEXT NOT NULL,
  score REAL NOT NULL,
  grade TEXT NOT NULL,
  reviewer TEXT,
  comment TEXT,
  status TEXT NOT NULL,
  UNIQUE(employee_id, period)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_candidates_job ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_emp ON enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(work_date);
`;

function initDb(): DB {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  migrate(db);
  const row = db.prepare("SELECT COUNT(*) AS n FROM employees").get() as { n: number } | undefined;
  if (!row || Number(row.n) === 0) {
    seedDatabase(db);
  }
  return db;
}

/**
 * 轻量迁移：用 PRAGMA user_version 记录版本，后续加表/加字段时在这里追加步骤。
 * 已有数据库会在启动时自动补齐，不需要手工改库。
 */
function migrate(db: DB): void {
  const current = Number((db.prepare("PRAGMA user_version").get() as { user_version: number } | undefined)?.user_version ?? 0);
  let version = current;

  if (version < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        detail TEXT NOT NULL,
        ip TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
    `);
    version = 1;
  }

  if (version !== current) {
    db.exec(`PRAGMA user_version = ${version}`);
  }
}

export function getDb(): DB {
  if (!globalRef.__hrDb) {
    globalRef.__hrDb = initDb();
  }
  return globalRef.__hrDb;
}

export const dbPath = DB_PATH;
