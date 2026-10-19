import { getDb } from "./db";

export const APPROVAL_TYPES = ["请假", "加班", "调班", "转正", "离职", "培训申请"] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];
export const APPROVAL_STATUS = ["待审批", "已通过", "已驳回", "已撤回"] as const;

export type Approval = {
  id: number;
  type: string;
  requester: string;
  employeeId: number | null;
  title: string;
  detail: string;
  startDate: string;
  endDate: string;
  amount: number | null;
  status: string;
  approver: string;
  comment: string;
  createdAt: string;
  decidedAt: string;
};

function mapRow(row: any): Approval {
  return {
    id: Number(row.id),
    type: String(row.type ?? ""),
    requester: String(row.requester ?? ""),
    employeeId: row.employee_id === null ? null : Number(row.employee_id),
    title: String(row.title ?? ""),
    detail: String(row.detail ?? ""),
    startDate: String(row.start_date ?? ""),
    endDate: String(row.end_date ?? ""),
    amount: row.amount === null ? null : Number(row.amount),
    status: String(row.status ?? ""),
    approver: String(row.approver ?? ""),
    comment: String(row.comment ?? ""),
    createdAt: String(row.created_at ?? ""),
    decidedAt: String(row.decided_at ?? ""),
  };
}

export function listApprovals(status?: string, limit = 100): Approval[] {
  const db = getDb();
  const rows = status
    ? db.prepare("SELECT * FROM approvals WHERE status = ? ORDER BY id DESC LIMIT ?").all(status, limit)
    : db.prepare("SELECT * FROM approvals ORDER BY id DESC LIMIT ?").all(limit);
  return (rows as any[]).map(mapRow);
}

export function approvalStats() {
  const db = getDb();
  const one = (sql: string, ...params: any[]) => Number((db.prepare(sql).get(...params) as any)?.n ?? 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  const month = monthStart.toISOString().slice(0, 10);
  return {
    pending: one("SELECT COUNT(*) n FROM approvals WHERE status = '待审批'"),
    approved: one("SELECT COUNT(*) n FROM approvals WHERE status = '已通过' AND decided_at >= ?", month),
    rejected: one("SELECT COUNT(*) n FROM approvals WHERE status = '已驳回' AND decided_at >= ?", month),
    total: one("SELECT COUNT(*) n FROM approvals"),
  };
}

export function createApproval(input: {
  type: string;
  requester: string;
  employeeId?: number | null;
  title: string;
  detail: string;
  startDate?: string;
  endDate?: string;
  amount?: number | null;
}): number {
  const res = getDb()
    .prepare(
      `INSERT INTO approvals (type, requester, employee_id, title, detail, start_date, end_date, amount, status, approver, comment, created_at, decided_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '待审批', '', '', ?, '')`,
    )
    .run(
      input.type,
      input.requester,
      input.employeeId ?? null,
      input.title,
      input.detail,
      input.startDate ?? "",
      input.endDate ?? "",
      input.amount ?? null,
      new Date().toISOString(),
    );
  return Number(res.lastInsertRowid);
}

export function decideApproval(id: number, decision: "已通过" | "已驳回", approver: string, comment: string): Approval | null {
  const db = getDb();
  const before = db.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as any;
  if (!before) return null;
  db.prepare("UPDATE approvals SET status = ?, approver = ?, comment = ?, decided_at = ? WHERE id = ?").run(
    decision,
    approver,
    comment.slice(0, 500),
    new Date().toISOString(),
    id,
  );
  const after = db.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as any;
  return mapRow(after);
}
