import fs from "node:fs";
import { chromium } from "playwright-core";

const base = "http://127.0.0.1:3000";
const csv = "\uFEFF课程名称,分类,时长(分钟),是否必修\n服务意识基础,服务,45,是\n消防安全演练,安全,30,是\n";
fs.writeFileSync("data/test-courses.csv", csv, "utf8");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill("#username", "hr");
await page.fill("#password", "doubletree2026");
await page.click(".login-card button");
await page.waitForURL(`${base}/`, { timeout: 20000 });

await page.goto(`${base}/agent`, { waitUntil: "networkidle" });
await page.setInputFiles('input[type="file"]', "data/test-courses.csv");
await page.waitForSelector("text=已导入", { timeout: 60000 });
await page.waitForTimeout(800);
const text = await page.locator(".msg").last().innerText();
console.log("reply:", text.replace(/\n/g, " | ").slice(0, 200));
await page.screenshot({ path: "shots/40-agent-upload.png" });
await browser.close();
