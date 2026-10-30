import { chromium } from "playwright-core";

const base = "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.fill("#username", "hr");
await page.fill("#password", "doubletree2026");
await page.click(".login-card button");
await page.waitForURL(`${base}/`, { timeout: 20000 });
await page.waitForLoadState("networkidle");

async function nav(selector) {
  const start = Date.now();
  await page.click(selector);
  await page.waitForLoadState("networkidle");
  return Date.now() - start;
}

const employees = await nav('a[href="/employees"]');
const approvals = await nav('a[href="/approvals"]');
const reports = await nav('a[href="/reports"]');
console.log("local nav ms:", JSON.stringify({ employees, approvals, reports }));

const perf = await page.evaluate(() => {
  const entries = performance.getEntriesByType("navigation")[0];
  return { domContentLoaded: Math.round(entries.domContentLoadedEventEnd), load: Math.round(entries.loadEventEnd) };
});
console.log("page timings:", JSON.stringify(perf));
await browser.close();
