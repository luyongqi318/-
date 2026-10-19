import { chromium } from "playwright-core";

const BASE = process.env.PUBLIC_BASE || "https://deeper-policies-missile-vitamins.trycloudflare.com";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#username", "hr");
await page.fill("#password", "doubletree2026");
await page.click(".login-card button");
await page.waitForURL(`${BASE}/`, { timeout: 25000 });

await page.goto(`${BASE}/agent`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const input = page.locator(".agent-input-row textarea").first();
await input.fill("给餐饮部新员工做一份培训方案");
await input.press("Enter");
await page.waitForTimeout(2200);
await input.fill("再给我一套客房服务员的面试提纲");
await input.press("Enter");
await page.waitForTimeout(2400);

await page.screenshot({ path: "shots/14-agent-samples.png" });
const bubbles = await page.locator(".msg.bot .msg-bubble").allInnerTexts();
console.log("bot replies:", bubbles.length);
for (const b of bubbles) console.log("---\n" + b.slice(0, 160).replace(/\n/g, " / "));
await browser.close();
