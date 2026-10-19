import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const KINDS = ["certificates", "dorms", "agency"];

export async function POST(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { kind } = await params;
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "未知的台账类型" }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const db = getDb();

  if (kind === "certificates") {
    const employeeId = Number(body.employeeId);
    const type = String(body.type ?? "").trim() || "健康证";
    const expiresAt = String(body.expiresAt ?? "").trim();
    if (!Number.isFinite(employeeId)) return NextResponse.json({ error: "请选择员工" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return NextResponse.json({ error: "到期日期格式应为 YYYY-MM-DD" }, { status: 400 });
    const res = db
      .prepare("INSERT INTO certificates (employee_id, type, number, issued_at, expires_at, note) VALUES (?, ?, ?, ?, ?, ?)")
      .run(employeeId, type, String(body.number ?? "").trim(), String(body.issuedAt ?? ""), expiresAt, String(body.note ?? ""));
    logAudit("新增证照", `${type} · ${expiresAt}`, session.u, clientIp(req));
    return NextResponse.json({ ok: true, id: Number(res.lastInsertRowid) });
  }

  if (kind === "dorms") {
    const employeeId = Number(body.employeeId);
    const building = String(body.building ?? "").trim();
    const roomNo = String(body.roomNo ?? "").trim();
    if (!Number.isFinite(employeeId)) return NextResponse.json({ error: "请选择员工" }, { status: 400 });
    if (!building || !roomNo) return NextResponse.json({ error: "请填写楼栋与房间号" }, { status: 400 });
    const exists = db
      .prepare("SELECT id FROM dorm_assignments WHERE employee_id = ? AND (check_out IS NULL OR check_out = '')")
      .get(employeeId);
    if (exists) return NextResponse.json({ error: "该员工已有在住记录" }, { status: 409 });
    const res = db
      .prepare("INSERT INTO dorm_assignments (employee_id, building, room_no, bed_no, fee, check_in, check_out) VALUES (?, ?, ?, ?, ?, ?, '')")
      .run(employeeId, building, roomNo, String(body.bedNo ?? ""), Number(body.fee) || null, String(body.checkIn ?? ""));
    logAudit("分配宿舍", `${building} ${roomNo}`, session.u, clientIp(req));
    return NextResponse.json({ ok: true, id: Number(res.lastInsertRowid) });
  }

  const name = String(body.name ?? "").trim();
  const agency = String(body.agency ?? "").trim();
  if (!name || !agency) return NextResponse.json({ error: "请填写姓名与劳务公司" }, { status: 400 });
  const res = db
    .prepare(
      "INSERT INTO agency_workers (name, agency, role, daily_rate, start_date, end_date, status, phone) VALUES (?, ?, ?, ?, ?, ?, '在岗', ?)",
    )
    .run(name, agency, String(body.role ?? ""), Number(body.dailyRate) || null, String(body.startDate ?? ""), String(body.endDate ?? ""), String(body.phone ?? ""));
  logAudit("登记临时工", `${name} · ${agency}`, session.u, clientIp(req));
  return NextResponse.json({ ok: true, id: Number(res.lastInsertRowid) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { kind } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "参数不正确" }, { status: 400 });
  const db = getDb();

  if (kind === "certificates") {
    const row = db.prepare("SELECT expires_at FROM certificates WHERE id = ?").get(id) as any;
    if (!row) return NextResponse.json({ error: "证照不存在" }, { status: 404 });
    const base = new Date(`${row.expires_at}T00:00:00`);
    const next = new Date(base.getFullYear() + 1, base.getMonth(), base.getDate());
    const expiresAt = next.toISOString().slice(0, 10);
    db.prepare("UPDATE certificates SET expires_at = ?, issued_at = ? WHERE id = ?").run(
      expiresAt,
      new Date().toISOString().slice(0, 10),
      id,
    );
    logAudit("证照续期", `新到期日 ${expiresAt}`, session.u, clientIp(req));
    return NextResponse.json({ ok: true, expiresAt });
  }

  if (kind === "dorms") {
    db.prepare("UPDATE dorm_assignments SET check_out = ? WHERE id = ?").run(new Date().toISOString().slice(0, 10), id);
    logAudit("退宿", `记录 ${id}`, session.u, clientIp(req));
    return NextResponse.json({ ok: true });
  }

  if (kind === "agency") {
    const status = String(body.status ?? "");
    if (!["在岗", "已离场"].includes(status)) return NextResponse.json({ error: "状态不合法" }, { status: 400 });
    db.prepare("UPDATE agency_workers SET status = ? WHERE id = ?").run(status, id);
    logAudit("临时工状态", `${id} → ${status}`, session.u, clientIp(req));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "未知的台账类型" }, { status: 400 });
}
