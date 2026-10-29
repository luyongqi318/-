import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = "data/hr.db";
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backup = path.join("data", `backup-before-demo-${stamp}.db`);

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
  "chat_messages",
  "import_batches",
  "employees",
  "departments",
];

db.exec("BEGIN");
for (const table of tables) {
  try {
    db.prepare(`DELETE FROM ${table}`).run();
  } catch {
    /* ignore */
  }
}
db.prepare("INSERT INTO settings (key, value) VALUES ('skip_seed', '0') ON CONFLICT(key) DO UPDATE SET value = '0'").run();
db.exec("COMMIT");
db.close();

console.log(JSON.stringify({ backup, cleared: tables.length }));
