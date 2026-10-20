import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
const key = db.prepare("SELECT value FROM settings WHERE key = 'agent_api_key'").get()?.value;
const base = db.prepare("SELECT value FROM settings WHERE key = 'agent_base_url'").get()?.value ?? "https://api.deepseek.com";
db.close();

for (const effort of ["max", "high"]) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "deepseek-flash",
      messages: [{ role: "user", content: "1+1=?" }],
      max_tokens: 20,
      reasoning_effort: effort,
    }),
  });
  const text = await res.text();
  console.log("effort", effort, "→", res.status, text.slice(0, 160).replace(/\n/g, " "));
}
