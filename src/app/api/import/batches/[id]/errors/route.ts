import { getSession } from "@/lib/auth";
import { getBatchErrors } from "@/lib/import-batches";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("请先登录", { status: 401 });

  const { id } = await params;
  const errors = getBatchErrors(Number(id));
  const escape = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const csv = ["行号,原因", ...errors.map((item) => `${item.line},${escape(item.message)}`)].join("\r\n");
  return new Response(`\uFEFF${csv}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="import-${id}-errors.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
