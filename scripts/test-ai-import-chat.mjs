// 规则完全匹配不上的表头，验证走 DeepSeek 整理后入库 + 对话留存
const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];
const auth = { cookie, "content-type": "application/json" };

const csv = [
  "Staff ID,Full Name,Dept Name,Job,Joined On,Pay",
  "A9001,陈晨,Front Office,Concierge,03-Feb-2023,6500",
  "A9002,周杰,Housekeeping,Room Attendant,12-Nov-2020,5800",
].join("\r\n");

const form = new FormData();
form.append("entity", "auto");
form.append("file", new Blob(["\uFEFF" + csv], { type: "text/csv" }), "staff.csv");
const started = Date.now();
const res = await fetch(`${base}/api/import`, { method: "POST", headers: { cookie }, body: form });
const data = await res.json();
console.log("ai import:", res.status, Date.now() - started + "ms", JSON.stringify({ detected: data.detected?.label, inserted: data.inserted, notes: data.notes, error: data.error }).slice(0, 260));

// 对话留存
await fetch(`${base}/api/agent/chat`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ messages: [{ role: "user", content: "帮我写一句欢迎新员工的话" }] }),
});
const history = await (await fetch(`${base}/api/agent/chat`, { headers: { cookie } })).json();
console.log("chat history:", history.items?.length, history.items?.slice(-1)[0]?.role);
const page = await (await fetch(`${base}/agent`, { headers: { cookie } })).text();
console.log("agent page keeps history:", page.includes("欢迎新员工"));
