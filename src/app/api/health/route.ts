import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAgentConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** 供托管平台健康检查与线上巡检使用，不暴露任何敏感信息。 */
export async function GET() {
  let dbOk = false;
  let headcount = 0;
  try {
    const row = getDb().prepare("SELECT COUNT(*) AS n FROM employees WHERE status != '离职'").get() as { n: number };
    dbOk = true;
    headcount = Number(row?.n ?? 0);
  } catch {
    dbOk = false;
  }
  const agent = getAgentConfig();
  return NextResponse.json({
    status: dbOk ? "ok" : "degraded",
    ts: Date.now(),
    db: dbOk,
    headcount,
    agent: { configured: Boolean(agent.apiKey), source: agent.source, model: agent.model },
  });
}
