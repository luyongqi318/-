import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { dataCounts, resetBusinessData } from "@/lib/reset";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  return NextResponse.json({ counts: dataCounts() });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: { confirm?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  if (String(body.confirm ?? "").trim() !== "清空") {
    return NextResponse.json({ error: "请输入「清空」两个字确认" }, { status: 400 });
  }

  try {
    const result = resetBusinessData();
    logAudit("清空业务数据", `备份 ${result.backup}`, session.u, clientIp(req));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: `清空失败：${err instanceof Error ? err.message : "未知错误"}` }, { status: 500 });
  }
}
