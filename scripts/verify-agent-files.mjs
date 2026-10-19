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
await page.waitForTimeout(600);
const input = page.locator(".agent-input-row textarea").first();
await input.fill("帮我写一份客房服务员的招聘 JD");
await input.press("Enter");

await page.locator(".msg-action").first().waitFor({ timeout: 90000 });
const count = await page.locator(".msg-action").count();
console.log("export buttons:", count);

await page.waitForTimeout(400);
await page.screenshot({ path: "shots/26-agent-files.png" });

const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 30000 }),
  page.locator(".msg-action", { hasText: "Word" }).click(),
]);
const filePath = await download.path();
const size = fs.statSync(filePath).size;
const magic = fs.readFileSync(filePath).subarray(0, 2).toString("hex");
console.log("download:", download.suggestedFilename(), size, "bytes", "magic=" + magic);

await page.waitForTimeout(500);
await page.screenshot({ path: "shots/27-agent-downloaded.png" });
await browser.close();
