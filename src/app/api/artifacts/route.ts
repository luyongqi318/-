import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createArtifact, isFormat } from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: { format?: string; title?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const format = String(body.format ?? "");
  const title = String(body.title ?? "").trim() || "未命名文档";
  const content = String(body.content ?? "").trim();

  if (!isFormat(format)) return NextResponse.json({ error: "不支持的文件格式" }, { status: 400 });
  if (content.length < 5) return NextResponse.json({ error: "内容太短，无法生成文件" }, { status: 400 });
  if (content.length > 60000) return NextResponse.json({ error: "内容超过 6 万字，请分段导出" }, { status: 400 });

  try {
    const artifact = await createArtifact(format, title, content);
    return NextResponse.json({ ok: true, ...artifact, url: `/api/artifacts/${artifact.id}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "生成失败";
    return NextResponse.json({ error: `生成失败：${message}` }, { status: 500 });
  }
}
