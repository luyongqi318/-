import fs from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#username", "hr");
await page.fill("#password", "doubletree2026");
await page.click(".login-card button");
await page.waitForURL(`${BASE}/`, { timeout: 25000 });

await page.goto(`${BASE}/agent`, { waitUntil: "networkidle" });
const input = page.locator(".agent-input-row textarea").first();
await input.fill("各部门人数占比画个饼图");
await input.press("Enter");

await page.locator(".chart-block").first().waitFor({ timeout: 90000 });
await page.waitForTimeout(500);
await page.screenshot({ path: "shots/31-agent-chart.png" });
console.log("chart blocks:", await page.locator(".chart-block").count());

const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 30000 }),
  page.locator(".chart-block .msg-action").first().click(),
]);
const p = await download.path();
console.log("png:", download.suggestedFilename(), fs.statSync(p).size, "bytes");
await browser.close();
