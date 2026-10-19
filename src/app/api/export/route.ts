import { getSession } from "@/lib/auth";
import { EXPORTS } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("请先登录", { status: 401 });

  const type = new URL(req.url).searchParams.get("type") ?? "";
  const build = EXPORTS[type];
  if (!build) return new Response("未知的导出类型", { status: 400 });

  const { csv, filename } = build();
  const asciiName = `${type}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
