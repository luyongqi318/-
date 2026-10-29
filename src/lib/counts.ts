import { getDb } from "./db";

export function getApprovalsCount(): number {
  try {
    return Number((getDb().prepare("SELECT COUNT(*) AS n FROM approvals").get() as { n: number }).n);
  } catch {
    return 0;
  }
}
