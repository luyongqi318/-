import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
const row = db.prepare("SELECT value FROM settings WHERE key = 'agent_api_key'").get();
const base = db.prepare("SELECT value FROM settings WHERE key = 'agent_base_url'").get()?.value ?? "https://api.deepseek.com";
db.close();

const res = await fetch(`${base.replace(/\/+$/, "")}/models`, {
  headers: { Authorization: `Bearer ${row.value}` },
});
console.log("status", res.status);
const text = await res.text();
console.log(text.slice(0, 800));
