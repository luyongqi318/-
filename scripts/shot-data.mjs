import { chromium } from "playwright-core";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#username", "hr");
await page.fill("#password", "doubletree2026");
await page.click(".login-card button");
await page.waitForURL(`${BASE}/`, { timeout: 25000 });

await page.goto(`${BASE}/data`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: "shots/16-data-import.png" });

await page.goto(`${BASE}/data?tab=knowledge`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: "shots/17-knowledge.png" });

await page.goto(`${BASE}/data?tab=manual`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: "shots/18-manual.png" });

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
console.log("shot done, page errors:", errors.length);
await browser.close();
