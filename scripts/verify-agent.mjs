const base = process.env.PUBLIC_BASE || "https://deeper-policies-missile-vitamins.trycloudflare.com";

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0]?.split(";")[0] ?? "";
const headers = { "content-type": "application/json", cookie };

const health = await (await fetch(`${base}/api/health`)).json();
console.log("health:", health.status, "db=" + health.db, "headcount=" + health.headcount);

const prompts = [
  ["JD", "帮我写一份前台接待的招聘 JD"],
  ["面试题", "给我一套客房服务员的面试提纲"],
  ["培训方案", "给餐饮部新员工做一份培训方案"],
  ["政策", "试用期多久可以转正？"],
  ["招聘数据", "本周招聘进展如何？哪个岗位缺口最大？"],
  ["培训数据", "哪些员工培训逾期了？"],
  ["排班数据", "本月排班和考勤有什么风险？"],
  ["绩效数据", "绩效达标率怎么样？"],
];

for (const [label, content] of prompts) {
  const res = await fetch(`${base}/api/agent/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages: [{ role: "user", content }] }),
  });
  const data = await res.json();
  const tools = (data.tools ?? []).map((t) => t.tool).join("+");
  const first = String(data.reply ?? "").split("\n").filter(Boolean)[0] ?? "";
  console.log(`[${label}] ${res.status} tools=${tools || "-"} :: ${first.slice(0, 78)}`);
}

const pages = ["/", "/recruitment", "/training", "/employees", "/scheduling", "/performance", "/agent", "/settings"];
for (const path of pages) {
  const res = await fetch(`${base}${path}`, { headers: { cookie }, redirect: "manual" });
  const html = await res.text();
  console.log(`page ${path} -> ${res.status} ${html.includes("东锦江希尔顿逸林酒店") ? "ok" : "MISSING"}`);
}
