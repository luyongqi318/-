const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];

async function upload(csv, name, mode = "replace", entity = "auto") {
  const form = new FormData();
  form.append("entity", entity);
  form.append("mode", mode);
  form.append("file", new Blob(["\uFEFF" + csv], { type: "text/csv" }), name);
  const res = await fetch(`${base}/api/import`, { method: "POST", headers: { cookie }, body: form });
  return res.json();
}

const rosterA = "工号,姓名,部门,职位,入职日期\nT001,员工甲,前厅部,前台接待,2024-01-01\nT002,员工乙,客房部,客房服务员,2023-05-06";
const rosterB = "工号,姓名,部门,职位,入职日期\nT003,员工丙,餐饮部,餐厅服务员,2022-03-04";
const badFile = "工号,姓名,部门,职位,入职日期\nT004,员工丁,厨房,西厨厨师,不是日期";

console.log("A:", JSON.stringify(await upload(rosterA, "a.csv")).slice(0, 160));
console.log("B:", JSON.stringify(await upload(rosterB, "b.csv")).slice(0, 160));
console.log("bad:", JSON.stringify(await upload(badFile, "bad.csv")).slice(0, 200));

const batches = await (await fetch(`${base}/api/import/batches`, { headers: { cookie } })).json().catch(() => null);
console.log("batches endpoint:", batches ? "ok" : "missing");

const { DatabaseSync } = await import("node:sqlite");
const db = new DatabaseSync("data/hr.db");
console.log("employees now:", db.prepare("SELECT emp_no, name FROM employees ORDER BY id").all());
console.log("batches:", db.prepare("SELECT id, entity, mode, inserted, replaced, CASE WHEN errors_json IS NULL THEN 0 ELSE json_array_length(errors_json) END AS errs FROM import_batches ORDER BY id DESC LIMIT 4").all());
db.close();
