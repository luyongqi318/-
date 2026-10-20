import { NextResponse } from "next/server";
import { aiNormalizeImport } from "@/lib/ai-import";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { runImport, type ImportMode } from "@/lib/import-batches";
import { ALL_HEADERS, getEntity, mapRowsForEntity, parseTable } from "@/lib/import-schema";
import { clientIp } from "@/lib/rate-limit";

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
  const mode: ImportMode = String(form.get("mode") ?? "") === "append" ? "append" : "replace";
  const isAuto = entityKey === "auto";
  const entity = isAuto ? null : getEntity(entityKey);
  if (!isAuto && !entity) return NextResponse.json({ error: "未知的导入类型" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "请选择要上传的文件" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "文件是空的" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "文件超过 8MB，请拆分后再传" }, { status: 400 });

  try {
    const expected = isAuto ? ALL_HEADERS : [...(entity?.headers ?? [])];
    const { headers, rows } = await parseTable(file, expected);
    if (rows.length === 0) return NextResponse.json({ error: "没有解析到数据行，请检查表头与内容" }, { status: 400 });
    if (rows.length > 2000) return NextResponse.json({ error: "单次最多导入 2000 行，请拆分文件" }, { status: 400 });

    if (isAuto) {
      const mapped = mapRowsForEntity(headers, rows);
      if (mapped && mapped.rows.length) {
        const out = runImport(mapped.entity, mapped.rows, mode, session.u);
        logAudit(
          "导入数据",
          `${out.result.label}（自动识别 · ${mode === "replace" ? "覆盖" : "追加"}）：新增 ${out.result.inserted}，替换旧数据 ${out.replaced} 条`,
          session.u,
          clientIp(req),
        );
        return NextResponse.json({
          ok: true,
          ...out.result,
          replaced: out.replaced,
          batchId: out.batchId,
          mode,
          detected: mapped.detection,
        });
      }

      // 规则对不上：让 DeepSeek 整理成标准记录，再按同样的覆盖/追加规则入库
      const ai = await aiNormalizeImport(headers, rows);
      if (ai) {
        const out = runImport(ai.entity, ai.records, mode, session.u);
        logAudit(
          "导入数据",
          `${out.result.label}（DeepSeek 整理 · ${mode === "replace" ? "覆盖" : "追加"}）：新增 ${out.result.inserted}，替换旧数据 ${out.replaced} 条`,
          session.u,
          clientIp(req),
        );
        return NextResponse.json({
          ok: true,
          ...out.result,
          replaced: out.replaced,
          batchId: out.batchId,
          mode,
          notes: [`由 DeepSeek 整理后导入（${ai.batches} 批）`],
          detected: { entity: ai.entity, label: getEntity(ai.entity)?.label ?? ai.entity, matched: 0, total: 0, columns: [] },
        });
      }

      return NextResponse.json(
        {
          error:
            "没能识别出数据类型。请确认表头里有「姓名 / 部门 / 职位 / 课程名称 / 应聘职位」这类字段，或在下方按类型指定导入。",
        },
        { status: 422 },
      );
    }

    const out = runImport(entityKey, rows, mode, session.u);
    logAudit(
      "导入数据",
      `${out.result.label}（${mode === "replace" ? "覆盖" : "追加"}）：新增 ${out.result.inserted}，替换旧数据 ${out.replaced} 条`,
      session.u,
      clientIp(req),
    );
    return NextResponse.json({ ok: true, ...out.result, replaced: out.replaced, batchId: out.batchId, mode });
  } catch (err) {
    const message = err instanceof Error ? err.message : "导入失败";
    return NextResponse.json({ error: `导入失败：${message}` }, { status: 500 });
  }
}
