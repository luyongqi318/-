import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
db.prepare("INSERT INTO settings (key, value) VALUES ('agent_model', 'deepseek-flash') ON CONFLICT(key) DO UPDATE SET value = 'deepseek-flash'").run();
console.log(db.prepare("SELECT key, value FROM settings WHERE key = 'agent_model'").get());
db.close();
