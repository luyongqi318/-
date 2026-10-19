import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { getDb } from "@/lib/db";
import { normalizeDateSafe, todayIso } from "@/lib/employee-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const departmentId = Number(body.department_id);
  const position = String(body.position ?? "").trim();
  const hireDate = normalizeDateSafe(String(body.hire_date ?? "")) || todayIso();
  const status = ["在职", "试用期", "离职"].includes(body.status) ? body.status : "在职";
  const level = ["员工", "主管", "经理", "总监"].includes(body.level) ? body.level : "员工";

  if (!name) return NextResponse.json({ error: "请填写姓名" }, { status: 400 });
  if (!Number.isFinite(departmentId)) return NextResponse.json({ error: "请选择部门" }, { status: 400 });
  if (!position) return NextResponse.json({ error: "请填写职位" }, { status: 400 });

  const db = getDb();
  const dept = db.prepare("SELECT id FROM departments WHERE id = ?").get(departmentId);
  if (!dept) return NextResponse.json({ error: "部门不存在" }, { status: 400 });

  const maxRow = db
    .prepare("SELECT MAX(CAST(SUBSTR(emp_no, 5) AS INTEGER)) AS n FROM employees WHERE emp_no LIKE 'DJJ-%'")
    .get() as { n: number | null };
  const empNo = `DJJ-${String(Number(maxRow?.n ?? 0) + 1).padStart(4, "0")}`;

  const res = db
    .prepare(
      `INSERT INTO employees (emp_no, name, gender, phone, email, department_id, position, level, hire_date, status, contract_end, salary, birth_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      empNo,
      name,
      String(body.gender ?? "女").trim() || "女",
      String(body.phone ?? "").trim(),
      String(body.email ?? "").trim(),
      departmentId,
      position,
      level,
      hireDate,
      status,
      normalizeDateSafe(String(body.contract_end ?? "")) || null,
      Number(body.salary) || null,
      null,
    );

  logAudit("录入员工", `${name} · ${position}（${empNo}）`, session.u, clientIp(req));
  return NextResponse.json({ ok: true, id: Number(res.lastInsertRowid), emp_no: empNo });
}
