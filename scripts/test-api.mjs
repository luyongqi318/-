import { DatabaseSync } from "node:sqlite";

const base = "http://127.0.0.1:3000";
const results = [];

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];
results.push(["login", login.status]);

const headers = { "content-type": "application/json", cookie };

const created = await fetch(`${base}/api/recruitment/jobs`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    title: "测试职位·礼宾主管",
    department_id: 1,
    headcount: 2,
    salary_min: 8000,
    salary_max: 10000,
    priority: "高",
    description: "自动化冒烟测试创建，随后删除",
  }),
});
const createdJson = await created.json();
results.push(["create job", created.status, JSON.stringify(createdJson)]);

const patched = await fetch(`${base}/api/recruitment/candidates`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ id: 1, stage: "面试中" }),
});
results.push(["patch candidate", patched.status, await patched.text()]);

const assigned = await fetch(`${base}/api/training/assign`, {
  method: "POST",
  headers,
  body: JSON.stringify({ employee_id: 1, course_id: 5, due_date: "2026-11-20" }),
});
results.push(["assign training", assigned.status, await assigned.text()]);

const chat = await fetch(`${base}/api/agent/chat`, {
  method: "POST",
  headers,
  body: JSON.stringify({ messages: [{ role: "user", content: "本周招聘进展如何？哪个岗位缺口最大？" }] }),
});
const chatJson = await chat.json();
results.push(["agent chat", chat.status, chatJson.demo ? "demo" : "live", chatJson.tools?.map((t) => t.tool).join(",")]);
results.push(["agent reply", String(chatJson.reply ?? "").slice(0, 120).replace(/\n/g, " / ")]);

const chat2 = await fetch(`${base}/api/agent/chat`, {
  method: "POST",
  headers,
  body: JSON.stringify({ messages: [{ role: "user", content: "帮我写一份前台接待的招聘 JD" }] }),
});
const chat2Json = await chat2.json();
results.push(["agent jd", chat2.status, String(chat2Json.reply ?? "").slice(0, 40).replace(/\n/g, " / ")]);

// 清理冒烟测试数据
const db = new DatabaseSync("data/hr.db");
db.prepare("DELETE FROM jobs WHERE title LIKE '测试职位%'").run();
db.prepare("DELETE FROM enrollments WHERE employee_id = 1 AND course_id = 5 AND status = '未开始'").run();
db.prepare("UPDATE candidates SET stage = '新投递' WHERE id = 1").run();
db.close();

for (const row of results) console.log(row.join(" | "));
