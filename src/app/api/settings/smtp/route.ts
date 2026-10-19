import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSmtpConfig } from "@/lib/mailer";
import { setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const config = getSmtpConfig();
  return NextResponse.json({
    configured: config.configured,
    host: config.host,
    port: String(config.port),
    user: config.user,
    from: config.from,
    secure: config.secure,
  });
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

  const host = String(body.host ?? "").trim();
  const port = String(body.port ?? "").trim();
  const user = String(body.user ?? "").trim();
  const pass = String(body.pass ?? "");
  const from = String(body.from ?? "").trim();
  const secure = Boolean(body.secure);

  if (!host) return NextResponse.json({ error: "请填写 SMTP 主机" }, { status: 400 });
  if (!/^\d{2,5}$/.test(port)) return NextResponse.json({ error: "端口不正确" }, { status: 400 });
  if (!user) return NextResponse.json({ error: "请填写 SMTP 账号" }, { status: 400 });

  setSetting("smtp_host", host);
  setSetting("smtp_port", port);
  setSetting("smtp_user", user);
  setSetting("smtp_from", from || user);
  setSetting("smtp_secure", secure ? "true" : "false");
  if (pass.trim()) setSetting("smtp_pass", pass.trim());

  const config = getSmtpConfig();
  return NextResponse.json({
    ok: true,
    configured: config.configured,
    host: config.host,
    port: String(config.port),
    user: config.user,
    from: config.from,
    secure: config.secure,
  });
}
