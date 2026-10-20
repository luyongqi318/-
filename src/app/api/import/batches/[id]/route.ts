import { getSession } from "@/lib/auth";
import { getBatchSnapshot } from "@/lib/import-batches";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("请先登录", { status: 401 });

  const { id } = await params;
  const snapshot = getBatchSnapshot(Number(id));
  if (!snapshot) return new Response("没有这条导入的旧数据存档", { status: 404 });

  const body = JSON.stringify({ entity: snapshot.entity, replacedAt: snapshot.createdAt, data: snapshot.data }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="import-${id}-snapshot.json"`,
      "Cache-Control": "no-store",
    },
  });
}
