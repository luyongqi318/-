import { DatabaseSync } from "node:sqlite";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const DEFAULT_PASS = "doubletree2026";
const NEW_PASS = "DoubleTree#2026";

async function login(password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "hr", password }),
  });
  return res;
}

const first = await login(DEFAULT_PASS);
const cookie = (first.headers.getSetCookie?.() ?? [first.headers.get("set-cookie")])[0].split(";")[0];
console.log("login default:", first.status);

const changed = await fetch(`${BASE}/api/auth/password`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ current: DEFAULT_PASS, next: NEW_PASS }),
});
console.log("change password:", changed.status, await changed.text());

console.log("login old password:", (await login(DEFAULT_PASS)).status, "(期望 401)");
console.log("login new password:", (await login(NEW_PASS)).status, "(期望 200)");

const wrong = await fetch(`${BASE}/api/auth/password`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ current: "not-the-password", next: "AnotherPass123" }),
});
console.log("change with wrong current:", wrong.status, "(期望 400)");

// 登录页应隐藏演示账号提示
const page = await (await fetch(`${BASE}/login`)).text();
console.log("login page hides demo hint:", !page.includes("doubletree2026"));

// 复原为默认密码，保持演示环境可用
const db = new DatabaseSync("data/hr.db");
db.prepare("DELETE FROM settings WHERE key = 'admin_password_hash'").run();
db.close();
console.log("reset to default:", (await login(DEFAULT_PASS)).status, "(期望 200)");
const page2 = await (await fetch(`${BASE}/login`)).text();
console.log("demo hint restored:", page2.includes("doubletree2026"));
