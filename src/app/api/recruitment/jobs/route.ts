import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { todayIso } from "@/lib/queries";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const departmentId = Number(body.department_id);
  const headcount = Number(body.headcount);
  const salaryMin = Number(body.salary_min) || 0;
  const salaryMax = Number(body.salary_max) || 0;
  const priority = ["高", "中", "低"].includes(body.priority) ? body.priority : "中";
  const description = String(body.description ?? "").trim();

  if (!title) return NextResponse.json({ error: "请填写职位名称" }, { status: 400 });
  if (!Number.isFinite(departmentId)) return NextResponse.json({ error: "请选择部门" }, { status: 400 });
  if (!Number.isFinite(headcount) || headcount < 1 || headcount > 100) {
    return NextResponse.json({ error: "招聘人数需在 1-100 之间" }, { status: 400 });
  }
  if (salaryMin < 0 || salaryMax < 0 || (salaryMax > 0 && salaryMax < salaryMin)) {
    return NextResponse.json({ error: "薪资区间不正确" }, { status: 400 });
  }

  const db = getDb();
  const dept = db.prepare("SELECT id FROM departments WHERE id = ?").get(departmentId);
  if (!dept) return NextResponse.json({ error: "部门不存在" }, { status: 400 });

  const result = db
    .prepare(
      `INSERT INTO jobs (title, department_id, headcount, filled, salary_min, salary_max, status, priority, owner, created_at, description)
       VALUES (?, ?, ?, 0, ?, ?, '招聘中', ?, ?, ?, ?)`,
    )
    .run(title, departmentId, headcount, salaryMin, salaryMax, priority, session.u, todayIso(), description);

  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}
