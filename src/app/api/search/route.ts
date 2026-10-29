import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGES = [
  { href: "/", label: "数据看板", keywords: ["看板", "首页", "dashboard", "总览"] },
  { href: "/recruitment", label: "招聘管理", keywords: ["招聘", "职位", "候选人", "面试"] },
  { href: "/training", label: "培训与入职", keywords: ["培训", "课程", "学习"] },
  { href: "/employees", label: "员工档案", keywords: ["员工", "花名册", "档案"] },
  { href: "/org", label: "组织架构", keywords: ["组织", "部门", "架构"] },
  { href: "/data", label: "数据投喂", keywords: ["导入", "上传", "知识库"] },
  { href: "/approvals", label: "审批中心", keywords: ["审批", "请假", "加班", "调班"] },
  { href: "/admin", label: "行政台账", keywords: ["证照", "健康证", "宿舍", "临时工"] },
  { href: "/messages", label: "邮件中心", keywords: ["邮件", "发件", "通知"] },
  { href: "/scheduling", label: "排班与考勤", keywords: ["排班", "考勤", "打卡"] },
  { href: "/performance", label: "绩效评估", keywords: ["绩效", "考核", "评估"] },
  { href: "/audit", label: "审计日志", keywords: ["日志", "记录", "留痕"] },
  { href: "/agent", label: "AI 智能体", keywords: ["智能体", "ai", "助手"] },
  { href: "/settings", label: "系统设置", keywords: ["设置", "配置", "密码"] },
];

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ employees: [], jobs: [], pages: [] });

  const like = `%${q}%`;
  const db = getDb();
  const employees = db
    .prepare(
      `SELECT e.id, e.name, e.emp_no, e.position, d.name AS department
       FROM employees e LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.name LIKE ? OR e.emp_no LIKE ? OR e.position LIKE ? OR IFNULL(e.english_name,'') LIKE ?
       ORDER BY e.name LIMIT 6`,
    )
    .all(like, like, like, like) as any[];

  const jobs = db
    .prepare(
      `SELECT j.id, j.title, d.name AS department
       FROM jobs j LEFT JOIN departments d ON d.id = j.department_id
       WHERE j.title LIKE ? OR d.name LIKE ?
       ORDER BY j.id DESC LIMIT 4`,
    )
    .all(like, like) as any[];

  const pages = PAGES.filter(
    (page) => page.label.includes(q) || page.keywords.some((kw) => kw.toLowerCase().includes(q.toLowerCase())),
  ).slice(0, 5);

  return NextResponse.json({
    employees: employees.map((e) => ({
      id: Number(e.id),
      name: String(e.name),
      empNo: String(e.emp_no),
      position: String(e.position ?? ""),
      department: String(e.department ?? ""),
    })),
    jobs: jobs.map((j) => ({ id: Number(j.id), title: String(j.title), department: String(j.department ?? "") })),
    pages,
  });
}
