import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAgentConfig } from "@/lib/settings";

/** 用当前配置发一次最小请求，确认 Key 与网关可用。 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const config = getAgentConfig();
  if (!config.apiKey) {
    return NextResponse.json({ ok: false, error: "尚未配置 API Key" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "回复 ok" }],
        max_tokens: 8,
        temperature: 0,
      }),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      const hint = res.status === 401 || res.status === 403 ? "（API Key 未通过验证）" : "";
      return NextResponse.json({ ok: false, error: `HTTP ${res.status}${hint} ${text.slice(0, 160)}` }, { status: 200 });
    }
    let reply = "";
    try {
      reply = String(JSON.parse(text)?.choices?.[0]?.message?.content ?? "").slice(0, 60);
    } catch {
      reply = "";
    }
    return NextResponse.json({ ok: true, model: config.model, reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "连接失败";
    return NextResponse.json({ ok: false, error: `连接失败：${message}` }, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}
