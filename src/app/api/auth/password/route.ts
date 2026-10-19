import { NextResponse } from "next/server";
import { checkCredentials, getSession, setAdminPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!rateLimit(`pwd:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "尝试次数过多，请稍后再试" }, { status: 429 });
  }

  let body: { current?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const current = String(body.current ?? "");
  const next = String(body.next ?? "");

  if (!checkCredentials(session.u, current)) {
    return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });
  }
  if (next.length < 8) {
    return NextResponse.json({ error: "新密码至少 8 位" }, { status: 400 });
  }
  if (next.length > 72) {
    return NextResponse.json({ error: "新密码不要超过 72 位" }, { status: 400 });
  }
  if (next === current) {
    return NextResponse.json({ error: "新密码不能与当前密码相同" }, { status: 400 });
  }

  setAdminPassword(next);
  return NextResponse.json({ ok: true });
}
