import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
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

  const employeeId = Number(body.employee_id);
  const courseId = Number(body.course_id);
  const dueDate = String(body.due_date ?? "").trim() || todayIso();

  if (!Number.isFinite(employeeId) || !Number.isFinite(courseId)) {
    return NextResponse.json({ error: "员工或课程参数不正确" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ error: "截止日期格式应为 YYYY-MM-DD" }, { status: 400 });
  }

  const db = getDb();
  const employee = db.prepare("SELECT id, name, status FROM employees WHERE id = ?").get(employeeId) as any;
  if (!employee || employee.status === "离职") {
    return NextResponse.json({ error: "员工不存在或已离职" }, { status: 400 });
  }
  const course = db.prepare("SELECT id, title FROM courses WHERE id = ?").get(courseId) as any;
  if (!course) return NextResponse.json({ error: "课程不存在" }, { status: 400 });

  const exists = db
    .prepare("SELECT id FROM enrollments WHERE employee_id = ? AND course_id = ? AND status != '已完成'")
    .get(employeeId, courseId);
  if (exists) return NextResponse.json({ error: "该员工已有同一门未完成课程" }, { status: 409 });

  const result = db
    .prepare(
      `INSERT INTO enrollments (employee_id, course_id, status, progress, score, assigned_at, due_date, completed_at)
       VALUES (?, ?, '未开始', 0, NULL, ?, ?, NULL)`,
    )
    .run(employeeId, courseId, todayIso(), dueDate);

  logAudit("分配培训", `${employee.name} ← ${course.title}`, session.u, clientIp(req));
  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}
