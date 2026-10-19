import { NextResponse } from "next/server";
import { checkCredentials, createSessionToken, sessionCookie } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`login:${clientIp(req)}`, 10, 5 * 60_000)) {
    return NextResponse.json({ error: "尝试次数过多，请 5 分钟后再试" }, { status: 429 });
  }
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!checkCredentials(username, password)) {
    return NextResponse.json({ error: "账号或密码不正确" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  const forwarded = req.headers.get("x-forwarded-proto");
  const isHttps = new URL(req.url).protocol === "https:" || forwarded === "https";
  res.cookies.set(sessionCookie.name, createSessionToken(username), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookie.maxAge,
    secure: isHttps,
  });
  return res;
}
