import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/** 清空业务数据（保留表结构、登录密码、模型/SMTP 配置），并先做一份备份。 */
export function resetBusinessData(): { backup: string; removed: Record<string, number> } {
  const dbPath = process.env.HR_DB_PATH || path.join(process.cwd(), "data", "hr.db");
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backup = path.join(dir, `backup-before-reset-${stamp}.db`);

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);

  const tables = [
    "enrollments",
    "attendance",
    "shifts",
    "reviews",
    "interviews",
    "candidates",
    "jobs",
    "courses",
    "certificates",
    "dorm_assignments",
    "agency_workers",
    "approvals",
    "messages",
    "knowledge",
    "employees",
    "departments",
  ];

  const removed: Record<string, number> = {};
  db.exec("BEGIN");
  try {
    for (const table of tables) {
      const count = Number((db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n);
      removed[table] = count;
      db.prepare(`DELETE FROM ${table}`).run();
    }
    db.exec("COMMIT");
    // 标记为「已清空」，避免重启时又自动灌入演示数据
    db.prepare("INSERT INTO settings (key, value) VALUES ('skip_seed', '1') ON CONFLICT(key) DO UPDATE SET value = '1'").run();
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }

  return { backup, removed };
}

export function dataCounts(): Record<string, number> {
  const dbPath = process.env.HR_DB_PATH || path.join(process.cwd(), "data", "hr.db");
  const db = new DatabaseSync(dbPath);
  const tables = ["employees", "departments", "jobs", "candidates", "courses", "enrollments", "approvals", "messages", "knowledge"];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    try {
      counts[table] = Number((db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n);
    } catch {
      counts[table] = 0;
    }
  }
  db.close();
  return counts;
}
