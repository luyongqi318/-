import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { importRows, parseTable, getEntity } from "@/lib/import-schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "请求格式不正确，请使用表单上传" }, { status: 400 });
  }

  const entityKey = String(form.get("entity") ?? "");
  const entity = getEntity(entityKey);
  if (!entity) return NextResponse.json({ error: "未知的导入类型" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "请选择要上传的文件" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "文件是空的" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "文件超过 8MB，请拆分后再传" }, { status: 400 });

  try {
    const { rows } = await parseTable(file);
    if (rows.length === 0) return NextResponse.json({ error: "没有解析到数据行，请检查表头与内容" }, { status: 400 });
    if (rows.length > 2000) return NextResponse.json({ error: "单次最多导入 2000 行，请拆分文件" }, { status: 400 });
    const result = importRows(entityKey, rows);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "导入失败";
    return NextResponse.json({ error: `导入失败：${message}` }, { status: 500 });
  }
}
