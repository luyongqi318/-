import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => iso(new Date(today.getTime() + n * 86400000));
const now = new Date().toISOString();

const staff = db.prepare("SELECT e.id, e.name, e.position, d.name AS dept FROM employees e JOIN departments d ON d.id=e.department_id WHERE e.status != '离职' ORDER BY e.id").all();

// 证照：故意做过期、30 天内到期、正常三种状态
const certPlan = [-21, -4, 8, 15, 22, 27, 40, 65, 90, 120, 150, 180, 210, 240, 300, 330];
const insCert = db.prepare("INSERT INTO certificates (employee_id, type, number, issued_at, expires_at, note) VALUES (?, ?, ?, ?, ?, ?)");
const certStaff = staff.filter((s) => /厨|服务|客房|保安|保洁|餐厅|前台/.test(s.position)).slice(0, certPlan.length);
certStaff.forEach((person, i) => {
  const type = person.position.includes("厨") ? "健康证 + 食品从业" : "健康证";
  insCert.run(person.id, type, `JK${2026000 + person.id}`, addDays(-330), addDays(certPlan[i]), "到期前 30 天安排体检");
});

// 宿舍
const insDorm = db.prepare("INSERT INTO dorm_assignments (employee_id, building, room_no, bed_no, fee, check_in, check_out) VALUES (?, ?, ?, ?, ?, ?, '')");
staff.slice(0, 14).forEach((person, i) => {
  insDorm.run(person.id, i < 8 ? "A 栋" : "B 栋", `20${(i % 4) + 1}`, `${(i % 3) + 1} 号床`, i < 4 ? 300 : 260, addDays(-90 - i * 17));
});

// 临时工
const insAgency = db.prepare("INSERT INTO agency_workers (name, agency, role, daily_rate, start_date, end_date, status, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
[
  ["刘建国", "上海锦程劳务", "宴会传菜", 260, addDays(-12), addDays(18), "在岗", "13900001001"],
  ["陈美玲", "上海锦程劳务", "客房清洁", 240, addDays(-30), addDays(5), "在岗", "13900001002"],
  ["王海涛", "浦东众信人力", "洗碗工", 230, addDays(-8), addDays(22), "在岗", "13900001003"],
  ["李秀华", "浦东众信人力", "宴会服务", 250, addDays(-60), addDays(-4), "已离场", "13900001004"],
  ["赵国庆", "上海锦程劳务", "搬运/布草", 260, addDays(-3), addDays(27), "在岗", "13900001005"],
  ["孙丽", "浦东众信人力", "公区保洁", 220, addDays(-18), addDays(12), "在岗", "13900001006"],
].forEach((row) => insAgency.run(...row));

// 审批单
const insApproval = db.prepare(
  "INSERT INTO approvals (type, requester, employee_id, title, detail, start_date, end_date, amount, status, approver, comment, created_at, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
);
const approvalRows = [
  ["请假", "王强", 3, "10 月 21 日调休 1 天", "上月加班 4 小时调休", addDays(1), addDays(1), 1, "待审批", "", "", now, ""],
  ["加班", "李娜", 5, "10 月 20 日宴会加班 4 小时", "宴会厅 120 人婚宴，需加班支援", addDays(-1), addDays(-1), 4, "待审批", "", "", now, ""],
  ["调班", "张伟", 8, "10 月 22 日早班换中班", "家中有事，与同事互换班次", addDays(2), addDays(2), 1, "待审批", "", "", now, ""],
  ["转正", "陈亚雅", 12, "试用期转正申请", "入职 3 个月，主管评价优秀", addDays(-3), addDays(-3), 0, "已通过", "人力资源部", "同意转正，薪资按 P2 档执行", now, now],
  ["离职", "赵敏", 16, "离职申请（提前 30 天）", "个人原因，最后工作日 11 月 20 日", addDays(-6), addDays(-6), 0, "已驳回", "人力资源部", "旺季人手不足，协商延后至 12 月", now, now],
  ["培训申请", "刘洋", 21, "参加食品安全复训", "年度复训，费用 480 元", addDays(4), addDays(5), 480, "已通过", "培训部", "列入 Q4 培训计划", now, now],
];
approvalRows.forEach((row) => insApproval.run(...row));

// 邮件中心（发件箱）
const insMessage = db.prepare(
  "INSERT INTO messages (to_addr, to_name, subject, body, template, status, error, provider, created_at, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
);
[
  ["wang.qiang@doubletree-pudong.com", "王强", "10 月 21 日调休申请已提交", "你的调休申请已提交，审批人：部门主管。审批结果会自动通知你。", "审批通知", "待发送", "未配置 SMTP", "outbox", now, ""],
  ["li.na@doubletree-pudong.com", "李娜", "面试邀约：宴会服务员", "你好，请于 10 月 23 日 14:00 到酒店 B1 人力资源部参加面试。", "面试邀约", "待发送", "未配置 SMTP", "outbox", now, ""],
  ["chen.yeya@doubletree-pudong.com", "陈亚雅", "转正通知", "恭喜通过试用期考核，自 11 月 1 日起转正。", "转正通知", "待发送", "未配置 SMTP", "outbox", now, ""],
  ["zhang.wei@doubletree-pudong.com", "张伟", "10 月排班表已发布", "10 月排班已发布，请在员工自助端查看并确认。", "排班通知", "待发送", "未配置 SMTP", "outbox", now, ""],
].forEach((row) => insMessage.run(...row));

// 知识库
const insKnowledge = db.prepare("INSERT INTO knowledge (title, content, created_at) VALUES (?, ?, ?)");
[
  [
    "员工手册（节选）",
    "一、考勤：员工须提前 10 分钟到岗，着工装、佩戴工牌。迟到 15 分钟内记警告一次，超过 30 分钟按旷工半天处理。\n二、请假：事假提前 3 天申请，病假需提供二级以上医院证明；年假按司龄计算，满 1 年 5 天，满 3 年 10 天。\n三、仪容：男士不过耳、不留胡须；女士淡妆，长发盘起。\n四、员工餐厅：供餐时间 06:30-09:00、11:00-13:30、17:00-19:30，凭工牌就餐。",
    now,
  ],
  [
    "排班与调班制度",
    "1. 排班表每月 25 日前发布次月班表，员工需在 3 日内确认。\n2. 调班须提前 24 小时在系统提交，经部门主管审批后生效，每人每月不超过 3 次。\n3. 连续工作 6 天须安排 1 天休息；夜班（22:00 后）次日安排补休。\n4. 旺季（婚宴、展会）可安排加班，加班时长按 1.5 倍调休或计薪。",
    now,
  ],
  [
    "离职交接清单",
    "1. 提交书面离职申请，试用期提前 3 天、转正后提前 30 天。\n2. 交接内容：工作事项、在办事项、客户/供应商联系、系统账号。\n3. 资产归还：工牌、工装、更衣柜钥匙、对讲机、办公电脑。\n4. 结算：最后一个工作日结清工资，年假未休部分折算。\n5. 宿舍：离职当日办理退宿，退还押金。",
    now,
  ],
].forEach((row) => insKnowledge.run(...row));

// 对话记录
const insChat = db.prepare("INSERT INTO chat_messages (role, content, tools, created_at) VALUES (?, ?, ?, ?)");
[
  ["user", "本月员工生日有哪些人？", "", now],
  ["assistant", "本月共 18 位员工生日，集中在客房部与餐饮部。需要我按部门列一份名单，或生成生日会通知邮件吗？", "[]", now],
  ["user", "帮我写一份宴会服务员的招聘 JD", "", now],
  ["assistant", "已生成《宴会服务员招聘 JD》，包含岗位职责、任职要求、班次说明与薪资范围，可直接用下方 Word 按钮导出。", "[]", now],
].forEach((row) => insChat.run(...row));

const counts = {
  certificates: db.prepare("SELECT COUNT(*) n FROM certificates").get().n,
  dorms: db.prepare("SELECT COUNT(*) n FROM dorm_assignments").get().n,
  agency: db.prepare("SELECT COUNT(*) n FROM agency_workers").get().n,
  approvals: db.prepare("SELECT COUNT(*) n FROM approvals").get().n,
  messages: db.prepare("SELECT COUNT(*) n FROM messages").get().n,
  knowledge: db.prepare("SELECT COUNT(*) n FROM knowledge").get().n,
  chat: db.prepare("SELECT COUNT(*) n FROM chat_messages").get().n,
};
console.log(JSON.stringify(counts));
db.close();
