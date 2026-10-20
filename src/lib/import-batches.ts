import { getDb } from "./db";
import { importRows } from "./import-schema";

/** 覆盖导入时，需要连带清理的从表（先删从表，避免外键约束） */
const DEPENDENTS: Record<string, string[]> = {
  employees: ["enrollments", "reviews", "shifts", "attendance", "certificates", "dorm_assignments"],
  jobs: ["interviews", "candidates"],
  candidates: ["interviews"],
  courses: ["enrollments"],
  enrollments: [],
};

export type ImportMode = "replace" | "append";

export type ImportOutcome = {
  entity: string;
  label: string;
  total: number;
  inserted: number;
  skipped: number;
  replaced: number;
  errors: { line: number; message: string }[];
  notes: string[];
  batchId: number;
  mode: ImportMode;
};

function recordBatch(
  entity: string,
  mode: ImportMode,
  inserted: number,
  replaced: number,
  snapshot: string | null,
  actor: string,
  errors: { line: number; message: string }[] = [],
  notes: string[] = [],
): number {
  const res = getDb()
    .prepare(
      `INSERT INTO import_batches (entity, mode, inserted, replaced, snapshot, actor, created_at, errors_json, notes_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      entity,
      mode,
      inserted,
      replaced,
      snapshot,
      actor,
      new Date().toISOString(),
      errors.length ? JSON.stringify(errors).slice(0, 200000) : null,
      notes.length ? JSON.stringify(notes).slice(0, 50000) : null,
    );
  return Number(res.lastInsertRowid);
}

/** 把归档的旧数据写回（覆盖导入失败时回滚用）。 */
function restoreArchived(db: ReturnType<typeof getDb>, archived: Record<string, unknown[]>, order: string[]): void {
  db.exec("BEGIN");
  try {
    for (const table of [...order].reverse()) {
      const list = archived[table];
      if (!list?.length) continue;
      const columns = Object.keys(list[0] as Record<string, unknown>);
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      );
      for (const row of list) {
        stmt.run(...columns.map((column) => (row as Record<string, unknown>)[column] as never));
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** 统一入口：覆盖模式会先把旧数据（含从表）快照存档，再整体替换；新数据一条都没进来时自动回滚。 */
export function runImport(entity: string, rows: Record<string, string>[], mode: ImportMode, actor: string) {
  const db = getDb();
  let replaced = 0;
  let snapshot: string | null = null;
  let archived: Record<string, unknown[]> = {};
  let tables: string[] = [];

  if (mode === "replace") {
    tables = [...(DEPENDENTS[entity] ?? []), entity];
    for (const table of tables) {
      try {
        const list = db.prepare(`SELECT * FROM ${table}`).all() as unknown[];
        if (list.length) {
          archived[table] = list;
          replaced += list.length;
        }
      } catch {
        /* 表不存在就跳过 */
      }
    }
    if (Object.keys(archived).length) {
      snapshot = JSON.stringify(archived).slice(0, 1_500_000);
      db.exec("BEGIN");
      try {
        for (const table of tables) {
          db.prepare(`DELETE FROM ${table}`).run();
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
  }

  const result = importRows(entity, rows);

  // 新文件没有一条有效数据：把旧数据恢复回去，避免「导入失败反而清空」
  if (mode === "replace" && result.inserted === 0 && Object.keys(archived).length) {
    restoreArchived(db, archived, tables);
    replaced = 0;
    result.notes.push("新文件没有可导入的有效数据，已自动回滚到导入前的数据");
  }

  const batchId = recordBatch(entity, mode, result.inserted, replaced, snapshot, actor, result.errors, result.notes);

  return { result, replaced, batchId, mode } satisfies { result: typeof result; replaced: number; batchId: number; mode: ImportMode };
}

export type BatchRow = {
  id: number;
  entity: string;
  mode: string;
  inserted: number;
  replaced: number;
  actor: string;
  createdAt: string;
  hasSnapshot: boolean;
  errorCount: number;
};

export function listBatches(limit = 12): BatchRow[] {
  const rows = getDb()
    .prepare(
      `SELECT id, entity, mode, inserted, replaced, actor, created_at,
              LENGTH(snapshot) AS size,
              CASE WHEN errors_json IS NULL THEN 0 ELSE json_array_length(errors_json) END AS errs
       FROM import_batches ORDER BY id DESC LIMIT ?`,
    )
    .all(limit) as any[];
  return rows.map((row) => ({
    id: Number(row.id),
    entity: String(row.entity ?? ""),
    mode: String(row.mode ?? ""),
    inserted: Number(row.inserted ?? 0),
    replaced: Number(row.replaced ?? 0),
    actor: String(row.actor ?? ""),
    createdAt: String(row.created_at ?? ""),
    hasSnapshot: Number(row.size ?? 0) > 0,
    errorCount: Number(row.errs ?? 0),
  }));
}

export function getBatchErrors(id: number): { line: number; message: string }[] {
  const row = getDb().prepare("SELECT errors_json FROM import_batches WHERE id = ?").get(id) as any;
  if (!row?.errors_json) return [];
  try {
    const parsed = JSON.parse(row.errors_json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getBatchSnapshot(id: number): { entity: string; createdAt: string; data: unknown } | null {
  const row = getDb().prepare("SELECT entity, created_at, snapshot FROM import_batches WHERE id = ?").get(id) as any;
  if (!row?.snapshot) return null;
  try {
    return { entity: String(row.entity), createdAt: String(row.created_at), data: JSON.parse(row.snapshot) };
  } catch {
    return null;
  }
}
