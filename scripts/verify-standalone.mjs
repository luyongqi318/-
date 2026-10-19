import { chromium } from "playwright-core";

const BASE = process.env.CONTAINER_BASE || "http://127.0.0.1:3100";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });

const failed = [];
page.on("response", (res) => {
  if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
});

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
const cssLoaded = await page.evaluate(() => {
  const card = document.querySelector(".login-card");
  if (!card) return false;
  return getComputedStyle(card).borderRadius !== "0px";
});
console.log("css loaded:", cssLoaded);

await page.fill("#username", "hr");
await page.fill("#password", "doubletree2026");
await page.click(".login-card button");
await page.waitForURL(`${BASE}/`, { timeout: 25000 });
await page.waitForTimeout(1800);
console.log("title:", await page.title());
console.log("kpi:", (await page.locator(".stat-value").first().innerText()).replace(/\n/g, " "));
await page.screenshot({ path: "shots/15-standalone.png" });
console.log("failed requests:", failed.length ? failed.slice(0, 5).join(" | ") : "none");
await browser.close();
