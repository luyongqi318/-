import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendMail, verifySmtp } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!rateLimit(`mailtest:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "测试太频繁，请稍后再试" }, { status: 429 });
  }

  let body: { to?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* 允许空 body，只做连通性检查 */
  }

  const check = await verifySmtp();
  if (!check.ok) return NextResponse.json({ ok: false, stage: "verify", error: check.error });

  const to = String(body.to ?? "").trim();
  if (to) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ ok: false, stage: "send", error: "收件邮箱格式不正确" });
    }
    const sent = await sendMail({
      to,
      subject: "HR 平台邮件通道测试",
      body: "这是一封来自东锦江希尔顿逸林酒店 HR 平台的测试邮件。收到即说明 SMTP 配置正确。",
      template: "test",
    });
    return NextResponse.json({ ok: sent.ok, stage: "send", error: sent.error });
  }

  return NextResponse.json({ ok: true, stage: "verify" });
}
