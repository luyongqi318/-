import { getSession } from "@/lib/auth";
import { getEntity, templateCsv } from "@/lib/import-schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("请先登录", { status: 401 });

  const key = new URL(req.url).searchParams.get("entity") ?? "";
  const entity = getEntity(key);
  if (!entity) return new Response("未知的导入类型", { status: 400 });

  const csv = templateCsv(key);
  const asciiName = `${entity.key}-template.csv`;
  const utf8Name = encodeURIComponent(`${entity.label}-模板.csv`);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      "Cache-Control": "no-store",
    },
  });
}
