const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];
const headers = { "content-type": "application/json", cookie };
console.log("login:", login.status);

const before = await (await fetch(`${base}/api/settings/agent`, { headers })).json();
console.log("before:", JSON.stringify(before));

const save = await (
  await fetch(`${base}/api/settings/agent`, {
    method: "POST",
    headers,
    body: JSON.stringify({ apiKey: "sk-test-invalid-1234567890", baseUrl: "https://api.deepseek.com", model: "deepseek-chat" }),
  })
).json();
console.log("save fake key:", JSON.stringify(save));

const test = await (await fetch(`${base}/api/settings/agent/test`, { method: "POST", headers })).json();
console.log("test connection:", JSON.stringify(test).slice(0, 220));

const chat = await fetch(`${base}/api/agent/chat`, {
  method: "POST",
  headers,
  body: JSON.stringify({ messages: [{ role: "user", content: "你好" }] }),
});
console.log("chat with bad key:", chat.status, (await chat.text()).slice(0, 200));

const clear = await (
  await fetch(`${base}/api/settings/agent`, { method: "POST", headers, body: JSON.stringify({ clearKey: true }) })
).json();
console.log("clear:", JSON.stringify(clear));

const chat2 = await fetch(`${base}/api/agent/chat`, {
  method: "POST",
  headers,
  body: JSON.stringify({ messages: [{ role: "user", content: "今天人力情况怎么样？" }] }),
});
const chat2Json = await chat2.json();
console.log("after clear:", chat2.status, chat2Json.demo ? "demo-mode" : "live", String(chat2Json.reply).slice(0, 60).replace(/\n/g, " / "));
