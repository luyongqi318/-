// 用英语表头 + 01-Jul-2019 日期，验证「不再被格式限制」
const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];
const auth = { cookie, "content-type": "application/json" };

const csv = [
  "HotelNo.,C/Name,Gender,部门,PositionChinese,DateJoined",
  "H9001,张伟,男,前厅部,前台接待,01-Jul-2019",
  "H9002,李娜,女,客房部,客房服务员,15-Mar-2021",
  "H9003,王强,男,餐饮部,餐厅服务员,2020/8/1",
  "H9004,赵敏,女,厨房,西厨厨师,Jul 5, 2022",
].join("\r\n");

const form = new FormData();
form.append("entity", "auto");
form.append("file", new Blob(["\uFEFF" + csv], { type: "text/csv" }), "hotel-roster.csv");
const started = Date.now();
const res = await fetch(`${base}/api/import`, { method: "POST", headers: { cookie }, body: form });
const data = await res.json();
console.log("import:", res.status, Date.now() - started + "ms", JSON.stringify({ detected: data.detected?.label, inserted: data.inserted, skipped: data.skipped, errors: data.errors?.slice(0, 2) }));

// 查库确认映射与日期
const { DatabaseSync } = await import("node:sqlite");
const db = new DatabaseSync("data/hr.db");
console.log(db.prepare("SELECT emp_no, name, department_id, position, hire_date FROM employees WHERE emp_no LIKE 'H90%' OR name IN ('张伟','李娜','王强','赵敏') ORDER BY id DESC LIMIT 6").all());
db.close();
