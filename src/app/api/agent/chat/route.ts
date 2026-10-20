import { NextResponse } from "next/server";
import { askAgent } from "@/lib/agent";
import { getSession } from "@/lib/auth";
import { clearChat, listChat, saveChat } from "@/lib/chat";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  return NextResponse.json({ items: listChat(60) });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  clearChat();
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "登录状态已失效，请刷新页面重新登录" }, { status: 401 });
  if (!rateLimit(`agent:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "提问太频繁了，请休息一分钟再试" }, { status: 429 });
  }

  let body: { messages?: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) return NextResponse.json({ error: "缺少提问内容" }, { status: 400 });

  const question = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (question) saveChat("user", question);

  try {
    const result = await askAgent(messages);
    saveChat("assistant", result.reply, result.tools);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "智能体调用失败";
    saveChat("assistant", `⚠️ ${message}`);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
