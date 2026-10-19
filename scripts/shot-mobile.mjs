import { chromium } from "playwright-core";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#username", "hr");
await page.fill("#password", "doubletree2026");
await page.click(".login-card button");
await page.waitForURL(`${BASE}/`, { timeout: 25000 });
await page.waitForTimeout(1500);

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log("dashboard horizontal overflow px:", overflow);
await page.screenshot({ path: "shots/19-mobile-dashboard.png", fullPage: false });

await page.goto(`${BASE}/recruitment`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({ path: "shots/20-mobile-recruitment.png" });

await page.goto(`${BASE}/scheduling`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({ path: "shots/21-mobile-scheduling.png" });

await browser.close();
