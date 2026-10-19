import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];

async function upload(entity, filePath, name) {
  const fd = new FormData();
  fd.append("entity", entity);
  fd.append("file", new File([fs.readFileSync(filePath)], name));
  const res = await fetch(`${base}/api/import`, { method: "POST", headers: { cookie }, body: fd });
  return { status: res.status, body: await res.json() };
}

console.log("xlsx (标题行 + 全角括号):", JSON.stringify((await upload("courses", "tmp/courses.xlsx", "courses.xlsx")).body).slice(0, 220));
console.log("gbk csv:", JSON.stringify((await upload("employees", "tmp/gbk-employees.csv", "gbk-employees.csv")).body).slice(0, 220));
console.log("bad xlsx:", JSON.stringify((await upload("employees", "tmp/bad.xlsx", "bad.xlsx")).body).slice(0, 220));

const db = new DatabaseSync("data/hr.db");
console.log("courses inserted:", db.prepare("SELECT COUNT(*) n FROM courses WHERE title LIKE '测试课程-Excel%'").get().n);
console.log("gbk employee:", JSON.stringify(db.prepare("SELECT name, department_id FROM employees WHERE name = '测试GBK'").get() ?? null));
db.prepare("DELETE FROM courses WHERE title LIKE '测试课程-Excel%'").run();
db.prepare("DELETE FROM employees WHERE name = '测试GBK'").run();
db.close();
console.log("cleaned");
