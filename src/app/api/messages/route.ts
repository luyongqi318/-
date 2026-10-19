import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { listMessages, sendMail } from "@/lib/mailer";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  return NextResponse.json({ items: listMessages(100) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const to = String(body.to ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const content = String(body.body ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "收件邮箱格式不正确" }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "请填写主题" }, { status: 400 });
  if (content.length < 10) return NextResponse.json({ error: "正文太短" }, { status: 400 });
  if (content.length > 8000) return NextResponse.json({ error: "正文过长" }, { status: 400 });

  const result = await sendMail({
    to,
    toName: String(body.toName ?? ""),
    subject,
    body: content,
    template: String(body.template ?? "custom"),
  });

  logAudit("发送邮件", `${to}：${subject}（${result.mode === "smtp" ? (result.ok ? "已发送" : "失败") : "进发件箱"}）`, session.u, clientIp(req));

  return NextResponse.json({ ok: result.ok, mode: result.mode, id: result.id, error: result.error });
}
