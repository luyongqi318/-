import { getDb } from "./db";

export function getSetting(key: string): string {
  try {
    const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value?: string } | undefined;
    return row?.value ? String(row.value) : "";
  } catch {
    return "";
  }
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  const trimmed = String(value ?? "").trim();
  if (trimmed) {
    db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run(key, trimmed);
  } else {
    db.prepare("DELETE FROM settings WHERE key = ?").run(key);
  }
}

export type AgentConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  source: "db" | "env" | "none";
  masked: string;
};

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return `****${key.slice(-4)}`;
}

/** 数据库里的配置优先，其次环境变量；页面保存后立即生效，无需重启。 */
export function getAgentConfig(): AgentConfig {
  const dbKey = getSetting("agent_api_key");
  const envKey = (process.env.DEEPSEEK_API_KEY || process.env.AGENT_API_KEY || "").trim();
  const apiKey = dbKey || envKey;
  return {
    apiKey,
    baseUrl: (getSetting("agent_base_url") || process.env.AGENT_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, ""),
    model: getSetting("agent_model") || process.env.AGENT_MODEL || "deepseek-chat",
    source: dbKey ? "db" : envKey ? "env" : "none",
    masked: maskKey(apiKey),
  };
}
