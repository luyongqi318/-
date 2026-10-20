import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
const rows = db.prepare("SELECT key, value FROM settings").all();
for (const row of rows) {
  const isSecret = String(row.key).includes("key") || String(row.key).includes("password");
  console.log(row.key, isSecret ? `${String(row.value).slice(0, 6)}…` : row.value);
}
db.close();
