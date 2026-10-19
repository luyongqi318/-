import { chromium } from "playwright-core";
import fs from "node:fs";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const OUT = "shots";
fs.mkdirSync(OUT, { recursive: true });

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (err) {
      console.log(`launch ${channel} failed: ${err.message.split("\n")[0]}`);
    }
  }
  throw new Error("no chromium-based browser found");
}

const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
const page = await context.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/01-login.png` });

await page.fill("#username", "hr");
await page.fill("#password", "doubletree2026");
await page.click(".login-card button");
await page.waitForURL(`${BASE}/`, { timeout: 20000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/02-dashboard.png` });
await page.screenshot({ path: `${OUT}/02-dashboard-full.png`, fullPage: true });

const routes = [
  ["recruitment", "03-recruitment"],
  ["training", "04-training"],
  ["employees", "05-employees"],
  ["scheduling", "06-scheduling"],
  ["performance", "07-performance"],
  ["agent", "08-agent"],
];

for (const [route, name] of routes) {
  await page.goto(`${BASE}/${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

// 智能体对话演示
await page.goto(`${BASE}/agent`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const suggestion = page.locator(".suggestion").first();
if (await suggestion.count()) {
  await suggestion.click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/09-agent-chat.png` });
}

// 移动端
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mp = await mobile.newPage();
await mp.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await mp.waitForTimeout(700);
await mp.screenshot({ path: `${OUT}/10-login-mobile.png` });

await browser.close();
console.log("screenshots done");
