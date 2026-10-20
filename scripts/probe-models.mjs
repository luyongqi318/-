import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
const key = db.prepare("SELECT value FROM settings WHERE key = 'agent_api_key'").get()?.value;
const base = db.prepare("SELECT value FROM settings WHERE key = 'agent_base_url'").get()?.value ?? "https://api.deepseek.com";
db.close();

const candidates = [
  "deepseek-flash-1017",
  "deepseek-flash-20251017",
  "deepseek-v4.1-flash-1017",
  "deepseek-v4.1-flash",
  "flash-1017",
  "deepseek-flash-preview",
];

for (const model of candidates) {
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
    });
    const text = await res.text();
    console.log(model, "→", res.status, text.slice(0, 140).replace(/\n/g, " "));
  } catch (err) {
    console.log(model, "→ error", err.message);
  }
}
