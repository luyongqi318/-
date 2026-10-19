import { getDb } from "./db";

export type AuditEntry = {
  id: number;
  ts: string;
  actor: string;
  action: string;
  detail: string;
  ip: string | null;
};

/** 写审计日志；失败不影响主流程（例如表还没建好的极早期启动）。 */
export function logAudit(action: string, detail: string, actor = "system", ip = ""): void {
  try {
    getDb()
      .prepare("INSERT INTO audit_log (ts, actor, action, detail, ip) VALUES (?, ?, ?, ?, ?)")
      .run(new Date().toISOString(), actor.slice(0, 40), action.slice(0, 40), String(detail).slice(0, 500), ip.slice(0, 60));
  } catch {
    /* 审计写入失败不阻塞业务 */
  }
}

export function listAudit(limit = 200, action?: string): AuditEntry[] {
  const db = getDb();
  const rows = action
    ? db.prepare("SELECT * FROM audit_log WHERE action = ? ORDER BY id DESC LIMIT ?").all(action, limit)
    : db.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?").all(limit);
  return (rows as any[]).map((row) => ({
    id: Number(row.id),
    ts: String(row.ts ?? ""),
    actor: String(row.actor ?? ""),
    action: String(row.action ?? ""),
    detail: String(row.detail ?? ""),
    ip: row.ip ? String(row.ip) : null,
  }));
}

export function auditActions(): string[] {
  const rows = getDb().prepare("SELECT action, COUNT(*) AS n FROM audit_log GROUP BY action ORDER BY n DESC").all() as {
    action: string;
  }[];
  return rows.map((r) => r.action);
}
