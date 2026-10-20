import fs from "node:fs";

const base = "http://127.0.0.1:3000";
const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];

const file = "shots/39-real-employees.png";
const dataUrl = `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
const res = await fetch(`${base}/api/agent/chat`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({
    messages: [
      {
        role: "user",
        content: "这张图是我们系统的哪个页面？用一句话说明。",
        attachments: [{ type: "image", dataUrl }],
      },
    ],
  }),
});
const data = await res.json();
console.log("status", res.status, "model", data.model, "demo", data.demo);
console.log("reply:", String(data.reply).slice(0, 220));
