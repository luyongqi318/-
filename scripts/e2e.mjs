import fs from "node:fs";
import { chromium } from "playwright-core";
import { DatabaseSync } from "node:sqlite";

/**
 * 端到端验收：UI 登录 → 九个页面 → 新建职位 → 数据导入 → 知识库投喂 → 智能体引用 → 404。
 * 用法：node scripts/e2e.mjs  [BAS E 默认 http://127.0.0.1:3000]
 */
const BASE = process.env.E2E_BASE || "http://127.0.0.1:3000";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  · " + detail : ""}`);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

// 先清理上次可能残留的测试数据
function cleanup() {
  const db = new DatabaseSync("data/hr.db");
  db.prepare("DELETE FROM jobs WHERE title = 'E2E验收职位'").run();
  db.prepare("DELETE FROM employees WHERE emp_no LIKE 'E2E-%'").run();
  db.prepare("DELETE FROM knowledge WHERE title = 'E2E班车规定'").run();
  db.prepare("DELETE FROM enrollments WHERE employee_id NOT IN (SELECT id FROM employees)").run();
  db.close();
}
cleanup();

// 1. 登录
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#username", "hr");
await page.fill("#password", "doubletree2026");
await page.click(".login-card button");
await page.waitForURL(`${BASE}/`, { timeout: 25000 });
await page.waitForTimeout(800);
check("登录进入工作台", page.url() === `${BASE}/`, page.url());

// 2. 九个页面
const pages = [
  ["/", "人力资源数据看板"],
  ["/recruitment", "招聘管理"],
  ["/training", "培训与入职"],
  ["/employees", "员工档案"],
  ["/data", "数据投喂"],
  ["/scheduling", "排班与考勤"],
  ["/performance", "绩效评估"],
  ["/agent", "AI 智能体"],
  ["/settings", "系统设置"],
];
for (const [path, heading] of pages) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const text = await page.locator("body").innerText();
  check(`页面 ${path}`, text.includes(heading), heading);
}

// 3. 新建职位（UI 弹窗）
await page.goto(`${BASE}/recruitment`, { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo(0, 0));
await page.getByRole("button", { name: "发布职位" }).click();
await page.waitForSelector(".modal", { timeout: 5000 });
await page.fill('.modal input[placeholder="如：前台接待"]', "E2E验收职位");
await page.locator(".modal .field", { hasText: "招聘人数" }).locator("input").fill("1");
await page.getByRole("button", { name: "确认发布" }).click();
await page.waitForSelector(".modal", { state: "detached", timeout: 10000 });
await page.waitForTimeout(1200);
const afterCreate = await page.locator("body").innerText();
check("发布职位后列表出现新职位", afterCreate.includes("E2E验收职位"));

// 4. 数据导入（UI 上传）
const csvPath = "tmp/e2e-employees.csv";
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync(
  csvPath,
  "\uFEFF工号,姓名,性别,手机号,部门,职位,级别,入职日期,状态\r\nE2E-001,E2E员工甲,女,13900001111,前厅部,礼宾员,员工,2026-10-01,在职\r\nE2E-002,E2E员工乙,男,13900002222,客房部,客房服务员,员工,2026-10-02,试用期\r\n",
  "utf8",
);
await page.goto(`${BASE}/data`, { waitUntil: "networkidle" });
const fileInput = page.locator('input[type="file"]').first();
await fileInput.setInputFiles(csvPath);
await page.waitForTimeout(2000);
const importText = await page.locator("body").innerText();
check("导入 CSV 显示新增 2 条", /新增 2 条/.test(importText), importText.match(/新增 \d+ 条/)?.[0] ?? "no result");

// 5. 知识库投喂 + 智能体引用
const knowledgeTitle = "E2E班车规定";
await page.goto(`${BASE}/data?tab=knowledge`, { waitUntil: "networkidle" });
await page.fill('input[placeholder^="如：员工手册"]', knowledgeTitle);
await page.fill("textarea", "员工班车每天早上 6:30 从龙阳路地铁站发车，21:45 从酒店返回，凭工牌乘车。");
await page.evaluate(() => window.scrollTo(0, 0));
await page.getByRole("button", { name: "投喂给智能体" }).click();
await page.waitForTimeout(1500);
const kbText = await page.locator("body").innerText();
check("知识库新增记录", kbText.includes(knowledgeTitle));

await page.goto(`${BASE}/agent`, { waitUntil: "networkidle" });
const input = page.locator(".agent-input-row textarea").first();
await input.fill("员工班车几点发车？");
await input.press("Enter");
await page.waitForTimeout(2200);
const agentText = await page.locator("body").innerText();
check("智能体引用投喂资料", agentText.includes("6:30") || agentText.includes("06:30"));

// 6. 404
await page.goto(`${BASE}/this-page-does-not-exist`, { waitUntil: "networkidle" });
const notFoundText = await page.locator("body").innerText();
check("404 品牌页", notFoundText.includes("页面不存在"), notFoundText.slice(0, 20));

await browser.close();

// 7. 清理测试数据
cleanup();
console.log("cleanup done");

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
if (failed.length) {
  console.log("失败项：" + failed.map((f) => f.name).join("、"));
  process.exit(1);
}
