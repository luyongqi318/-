/**
 * CI 冒烟：登录 → 导入员工 → 导出校验 → 知识库投喂 → 智能体引用。
 * 用法：node scripts/ci-smoke.mjs  （默认 http://127.0.0.1:3000）
 */
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:3000";
const fail = (msg) => {
  console.error("FAIL:", msg);
  process.exit(1);
};

const health = await (await fetch(`${BASE}/api/health`)).json();
if (health.status !== "ok" || !health.db) fail(`health=${JSON.stringify(health)}`);
console.log("health ok, headcount", health.headcount);

const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: process.env.HR_USER || "hr", password: process.env.HR_PASS || "doubletree2026" }),
});
if (!login.ok) fail(`login ${login.status}`);
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];
const auth = { cookie, "content-type": "application/json" };

const csv = "\uFEFF工号,姓名,性别,手机号,部门,职位,级别,入职日期,状态\r\nCI-001,CI员工,女,13900000001,前厅部,礼宾员,员工,2026-10-01,在职\r\n";
const form = new FormData();
form.append("entity", "employees");
form.append("file", new Blob([csv], { type: "text/csv" }), "ci.csv");
const imported = await (await fetch(`${BASE}/api/import`, { method: "POST", headers: { cookie }, body: form })).json();
if (imported.inserted !== 1) fail(`import ${JSON.stringify(imported)}`);
console.log("import ok");

const exported = await fetch(`${BASE}/api/export?type=employees`, { headers: { cookie } });
const csvOut = await exported.text();
if (!exported.ok || !csvOut.includes("CI员工")) fail("export missing row");
console.log("export ok, lines", csvOut.trim().split(/\r?\n/).length);

await fetch(`${BASE}/api/knowledge`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ title: "CI 班车说明", content: "员工班车每天 06:30 从龙阳路地铁站发车，凭工牌乘车。" }),
});
const chat = await (
  await fetch(`${BASE}/api/agent/chat`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ messages: [{ role: "user", content: "班车几点发车？" }] }),
  })
).json();
if (!String(chat.reply ?? "").includes("06:30")) fail(`agent reply ${JSON.stringify(chat).slice(0, 200)}`);
console.log("agent knowledge ok");

const backup = await fetch(`${BASE}/api/backup`, { headers: { cookie } });
const buf = Buffer.from(await backup.arrayBuffer());
if (!backup.ok || buf.length < 4096 || buf.subarray(0, 15).toString() !== "SQLite format 3") fail(`backup ${backup.status}`);
console.log("backup ok,", buf.length, "bytes");

// 本地重复跑时清理测试数据（CI 里数据库是临时的，删不到也不影响）
try {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(process.env.HR_DB_PATH || "data/hr.db");
  db.prepare("DELETE FROM employees WHERE emp_no LIKE 'CI-%'").run();
  db.prepare("DELETE FROM knowledge WHERE title LIKE 'CI %'").run();
  db.close();
} catch {
  /* ignore */
}

console.log("CI SMOKE PASSED");
