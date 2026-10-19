import { DatabaseSync } from "node:sqlite";

const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];
const authJson = { cookie, "content-type": "application/json" };

const before = await (await fetch(`${base}/api/health`)).json();
console.log("headcount before:", before.headcount);

const tpl = await fetch(`${base}/api/import/template?entity=employees`, { headers: { cookie } });
const tplText = await tpl.text();
console.log("template:", tpl.status, "lines=" + tplText.trim().split(/\r?\n/).length, tplText.split(/\r?\n/)[0].slice(0, 40));

const csv = [
  "工号,姓名,性别,手机号,邮箱,部门,职位,级别,入职日期,状态,合同到期,月薪",
  "DJJ-9901,测试甲,女,13800009901,,前厅部,礼宾员,员工,2026-10-01,在职,2029-10-01,6500",
  ",测试乙,男,13800009902,,工程部,电工,员工,2026-09-15,试用期,,6200",
].join("\r\n");

const fd = new FormData();
fd.append("entity", "employees");
fd.append("file", new Blob(["\uFEFF" + csv], { type: "text/csv" }), "employees.csv");
const imp = await fetch(`${base}/api/import`, { method: "POST", headers: { cookie }, body: fd });
console.log("import employees:", imp.status, JSON.stringify(await imp.json()).slice(0, 300));

const badgeFd = new FormData();
badgeFd.append("entity", "jobs");
badgeFd.append(
  "file",
  new Blob(["\uFEFF职位,部门,招聘人数,薪资下限,薪资上限,优先级\r\n测试岗位-导入,前厅部,1,6000,7000,中"], { type: "text/csv" }),
  "jobs.csv",
);
console.log("import jobs:", (await fetch(`${base}/api/import`, { method: "POST", headers: { cookie }, body: badgeFd })).status);

const after = await (await fetch(`${base}/api/health`)).json();
console.log("headcount after:", after.headcount);

const kb = await fetch(`${base}/api/knowledge`, {
  method: "POST",
  headers: authJson,
  body: JSON.stringify({
    title: "员工停车与班车规定",
    content:
      "员工班车每天 06:30 从龙阳路地铁站 2 号口发车，21:45 从酒店员工通道返回；车位需提前在前台登记，月租 300 元。",
  }),
});
console.log("knowledge add:", kb.status);

const ask = await fetch(`${base}/api/agent/chat`, {
  method: "POST",
  headers: authJson,
  body: JSON.stringify({ messages: [{ role: "user", content: "员工班车几点发车？" }] }),
});
const askJson = await ask.json();
console.log("agent kb answer:", ask.status, (askJson.tools ?? []).map((t) => t.tool).join(","), "::", String(askJson.reply).slice(0, 70).replace(/\n/g, " / "));

const manual = await fetch(`${base}/api/employees`, {
  method: "POST",
  headers: authJson,
  body: JSON.stringify({ name: "测试丙", department_id: 1, position: "前台接待", hire_date: "2026-10-10", status: "试用期" }),
});
const manualJson = await manual.json();
console.log("manual add:", manual.status, JSON.stringify(manualJson));

const db = new DatabaseSync("data/hr.db");
db.prepare("DELETE FROM employees WHERE phone LIKE '138000099%'").run();
db.prepare("DELETE FROM employees WHERE name = '测试丙'").run();
db.prepare("DELETE FROM jobs WHERE title = '测试岗位-导入'").run();
db.prepare("DELETE FROM knowledge WHERE title = '员工停车与班车规定'").run();
db.close();

const final = await (await fetch(`${base}/api/health`)).json();
console.log("headcount restored:", final.headcount);
