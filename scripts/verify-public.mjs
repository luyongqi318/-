import { chromium } from "playwright-core";

const BASE = process.env.PUBLIC_BASE || "https://deeper-policies-missile-vitamins.trycloudflare.com";

const health = await fetch(`${BASE}/login`, { redirect: "manual" });
console.log("GET /login ->", health.status, (await health.text()).includes("登录工作台") ? "content-ok" : "content-miss");

const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0]?.split(";")[0] ?? "";
console.log("POST /api/auth/login ->", login.status, cookie ? "cookie-set" : "no-cookie");

const dash = await fetch(`${BASE}/`, { headers: { cookie }, redirect: "manual" });
const dashHtml = await dash.text();
console.log("GET / (auth) ->", dash.status, dashHtml.includes("人力资源数据看板") ? "dashboard-ok" : "dashboard-miss");

const chat = await fetch(`${BASE}/api/agent/chat`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ messages: [{ role: "user", content: "哪些员工培训逾期了？" }] }),
});
const chatJson = await chat.json();
console.log("POST /api/agent/chat ->", chat.status, chatJson.demo ? "demo-mode" : "live-model");
console.log("reply:", String(chatJson.reply ?? "").slice(0, 90).replace(/\n/g, " / "));

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 980 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#username", "hr");
await page.fill("#password", "doubletree2026");
await page.click(".login-card button");
await page.waitForURL(`${BASE}/`, { timeout: 25000 });
await page.waitForTimeout(2000);
console.log("browser title:", await page.title());
console.log("kpi text:", (await page.locator(".stat-value").first().innerText()).replace(/\n/g, " "));
await page.screenshot({ path: "shots/11-public-dashboard.png" });
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: "shots/13-public-settings.png" });
console.log("settings page:", await page.title(), (await page.locator(".badge").last().innerText()).trim());
await page.goto(`${BASE}/agent`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.locator(".suggestion").first().click();
await page.waitForTimeout(1800);
await page.screenshot({ path: "shots/12-public-agent.png" });
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
