import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { todayIso } from "@/lib/queries";

const STAGES = ["新投递", "简历筛选", "面试中", "待发 offer", "已入职", "已淘汰"];

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const id = Number(body.id);
  const stage = String(body.stage ?? "");
  if (!Number.isFinite(id)) return NextResponse.json({ error: "候选人 ID 不正确" }, { status: 400 });
  if (!STAGES.includes(stage)) return NextResponse.json({ error: "阶段不合法" }, { status: 400 });

  const db = getDb();
  const candidate = db.prepare("SELECT id, stage FROM candidates WHERE id = ?").get(id) as any;
  if (!candidate) return NextResponse.json({ error: "候选人不存在" }, { status: 404 });

  if (stage === "已入职") {
    db.prepare("UPDATE candidates SET stage = ?, hired_at = COALESCE(hired_at, ?) WHERE id = ?").run(stage, todayIso(), id);
  } else {
    db.prepare("UPDATE candidates SET stage = ? WHERE id = ?").run(stage, id);
  }

  return NextResponse.json({ ok: true, id, stage });
}
