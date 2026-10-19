import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
const now = new Date().toISOString();
const rows = [
  ["请假", "张伟", 4, "10 月 22-23 日 年假 2 天", "回老家办理证件，工作已与同事交接。", "2026-10-22", "2026-10-23", 2, "待审批", "", "", now, ""],
  ["加班", "李娜", 8, "10 月 20 日 宴会加班 4 小时", "婚宴接待人手不足，申请延长中班 4 小时。", "2026-10-20", "2026-10-20", 4, "待审批", "", "", now, ""],
  ["调班", "王强", 12, "10 月 21 日 早班换中班", "家中有事，与同事陈晨对调班次，已获对方同意。", "2026-10-21", "2026-10-21", 1, "待审批", "", "", now, ""],
  ["培训申请", "周敏", 5, "报名收益管理课程（外部）", "希望参加 11 月收益管理公开课，费用 2800 元。", "2026-11-05", "2026-11-06", 2800, "已通过", "hr", "同意，列入年度培训预算。", now, now],
  ["离职", "陈晨", 9, "客房部 陈晨 离职申请", "个人原因，计划 11 月 15 日离职，已沟通交接。", "2026-11-15", "2026-11-15", null, "已驳回", "hr", "旺季人手紧张，建议延后至 12 月并补充交接计划。", now, now],
];

const exists = db.prepare("SELECT id FROM approvals WHERE title = ?");
const stmt = db.prepare(
  `INSERT INTO approvals (type, requester, employee_id, title, detail, start_date, end_date, amount, status, approver, comment, created_at, decided_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
let added = 0;
for (const row of rows) {
  if (exists.get(row[3])) continue;
  stmt.run(...row);
  added += 1;
}
console.log("seeded approvals:", added);
db.close();
