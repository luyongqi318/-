import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import { buildWorkbook } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("请先登录", { status: 401 });

  const { buffer } = buildWorkbook();
  const stamp = new Date().toISOString().slice(0, 10);
  logAudit("导出报表", `经营报表 ${stamp}`, session.u, clientIp(req));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="hr-report-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
