import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { addKnowledge, deleteKnowledge, listKnowledge } from "@/lib/knowledge";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  return NextResponse.json({ items: listKnowledge() });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: { title?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title) return NextResponse.json({ error: "请填写资料标题" }, { status: 400 });
  if (content.length < 10) return NextResponse.json({ error: "内容太短，至少 10 个字" }, { status: 400 });
  if (content.length > 20000) return NextResponse.json({ error: "单条资料不超过 2 万字" }, { status: 400 });

  const id = addKnowledge(title, content);
  logAudit("投喂资料", title, session.u, clientIp(req));
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "参数不正确" }, { status: 400 });
  deleteKnowledge(id);
  logAudit("删除资料", `id=${id}`, session.u, clientIp(req));
  return NextResponse.json({ ok: true });
}
