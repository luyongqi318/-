const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];
const auth = { cookie, "content-type": "application/json" };

const health = await (await fetch(`${base}/api/health`)).json();
console.log("health:", health.status, health.headcount);

// 发起审批 → 应进发件箱（未配置 SMTP）
const created = await (
  await fetch(`${base}/api/approvals`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      type: "请假",
      requester: "测试审批",
      title: "10 月 20 日 事假 1 天",
      detail: "家中有事，需要请事假一天。",
      startDate: "2026-10-20",
      endDate: "2026-10-20",
      amount: 1,
    }),
  })
).json();
console.log("create approval:", JSON.stringify(created));

const decided = await (
  await fetch(`${base}/api/approvals`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ id: created.id, decision: "已通过", comment: "同意，注意交接。" }),
  })
).json();
console.log("decide:", decided.item?.status, decided.item?.comment);

const messages = await (await fetch(`${base}/api/messages`, { headers: { cookie } })).json();
console.log("messages:", messages.items.length, messages.items.slice(0, 2).map((m) => `${m.status}/${m.subject}`).join(" | "));

// 手工发信
const sent = await (
  await fetch(`${base}/api/messages`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      to: "candidate@example.com",
      toName: "候选人",
      subject: "面试邀约 · 前台接待",
      body: "您好，邀请您于 10 月 22 日 15:00 到店面试，地点：人力资源部。",
      template: "interview",
    }),
  })
).json();
console.log("compose:", JSON.stringify(sent));

// 页面可访问
for (const path of ["/approvals", "/messages", "/settings", "/audit"]) {
  const res = await fetch(`${base}${path}`, { headers: { cookie } });
  const text = await res.text();
  console.log(path, res.status, text.length > 5000 ? "ok" : "short");
}
