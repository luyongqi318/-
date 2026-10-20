import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const filePath = process.env.XLSX_PATH || "C:/Users/lu137/Desktop/Hotel name list-to oliver 的副本.xlsx";

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];

// 清空旧数据，模拟用户重新投喂
const db = new DatabaseSync("data/hr.db");
db.prepare("DELETE FROM employees").run();
db.prepare("DELETE FROM departments").run();
db.close();

const form = new FormData();
form.append("entity", "auto");
form.append("mode", "replace");
form.append("file", new File([fs.readFileSync(filePath)], "hotel.xlsx"));
const started = Date.now();
const res = await fetch(`${base}/api/import`, { method: "POST", headers: { cookie }, body: form });
const data = await res.json();
console.log("import:", res.status, Date.now() - started + "ms");
console.log(JSON.stringify({ label: data.label, inserted: data.inserted, replaced: data.replaced, errors: data.errors?.slice(0, 3), detected: data.detected?.label }, null, 1));

const check = new DatabaseSync("data/hr.db");
console.log("by dept:", check.prepare("SELECT d.name AS dept, COUNT(*) n FROM employees e JOIN departments d ON d.id=e.department_id GROUP BY d.name ORDER BY n DESC").all());
console.log("sample:", check.prepare("SELECT emp_no, name, position, hire_date, department_id FROM employees ORDER BY id LIMIT 5").all());
console.log("positions:", check.prepare("SELECT position, COUNT(*) n FROM employees GROUP BY position ORDER BY n DESC LIMIT 8").all());
check.close();
