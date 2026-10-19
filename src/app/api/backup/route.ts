import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 用 SQLite VACUUM INTO 生成一致性快照，避免直接拷贝 WAL 数据库拿到半截数据。 */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("请先登录", { status: 401 });

  const stamp = new Date()
    .toISOString()
    .replace(/[:T]/g, "-")
    .replace(/\..+$/, "");
  const tmp = path.join(os.tmpdir(), `hr-backup-${Date.now()}.db`);

  try {
    getDb().exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    const data = fs.readFileSync(tmp);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="doubletree-hr-${stamp}.db"`,
        "Content-Length": String(data.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "备份失败";
    return new Response(`备份失败：${message}`, { status: 500 });
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* 临时文件可能不存在，忽略 */
    }
  }
}
