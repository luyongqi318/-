import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { getAgentConfig, setSetting } from "@/lib/settings";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const config = getAgentConfig();
  return NextResponse.json({
    configured: Boolean(config.apiKey),
    masked: config.masked,
    baseUrl: config.baseUrl,
    model: config.model,
    source: config.source,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: { apiKey?: string; baseUrl?: string; model?: string; clearKey?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  if (typeof body.baseUrl === "string" && body.baseUrl.trim()) {
    const baseUrl = body.baseUrl.trim().replace(/\/+$/, "");
    if (!/^https?:\/\/[^\s]+$/i.test(baseUrl)) {
      return NextResponse.json({ error: "Base URL 必须以 http:// 或 https:// 开头" }, { status: 400 });
    }
    setSetting("agent_base_url", baseUrl);
  }

  if (typeof body.model === "string") {
    const model = body.model.trim();
    if (model.length > 80) return NextResponse.json({ error: "模型名称过长" }, { status: 400 });
    setSetting("agent_model", model);
  }

  if (body.clearKey) {
    setSetting("agent_api_key", "");
  } else if (typeof body.apiKey === "string" && body.apiKey.trim()) {
    const key = body.apiKey.trim();
    if (key.length < 12) return NextResponse.json({ error: "API Key 看起来不完整" }, { status: 400 });
    setSetting("agent_api_key", key);
  }

  const config = getAgentConfig();
  logAudit(
    "更新模型配置",
    body.clearKey ? "已清除 API Key" : `Key ${config.masked || "(未配置)"} · ${config.model}`,
    session.u,
    clientIp(req),
  );
  return NextResponse.json({
    ok: true,
    configured: Boolean(config.apiKey),
    masked: config.masked,
    baseUrl: config.baseUrl,
    model: config.model,
    source: config.source,
  });
}
