import { chromium } from "playwright-core";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#username", "hr");
await page.fill("#password", "doubletree2026");
await page.click(".login-card button");
await page.waitForURL(`${BASE}/`, { timeout: 25000 });
await page.waitForTimeout(2200);
await page.screenshot({ path: "shots/24-warm-dashboard.png" });

await page.goto(`${BASE}/data`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: "shots/25-auto-import.png" });

await page.goto(`${BASE}/audit`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.screenshot({ path: "shots/28-audit.png" });

await page.goto(`${BASE}/agent`, { waitUntil: "networkidle" });
const input = page.locator(".agent-input-row textarea").first();
await input.fill("帮我写一份客房服务员的招聘 JD");
await input.press("Enter");
await page.locator(".msg-action").first().waitFor({ timeout: 90000 });
await page.waitForTimeout(600);
await page.screenshot({ path: "shots/26-agent-files.png" });
console.log("actions:", await page.locator(".msg-action").count());

await browser.close();
