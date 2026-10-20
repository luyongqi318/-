import { NextResponse } from "next/server";
import { aiNormalizeImport } from "@/lib/ai-import";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { ALL_HEADERS, getEntity, importAuto, importRows, parseTable } from "@/lib/import-schema";
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
      const auto = importAuto(headers, rows);
      if (!auto || auto.result.inserted === 0) {
        // 规则对不上，直接把内容交给模型整理成标准记录再入库
        const ai = await aiNormalizeImport(headers, rows);
        if (ai && ai.inserted > 0) {
          const label = getEntity(ai.entity)?.label ?? ai.entity;
          logAudit(
            "导入数据",
            `${label}（DeepSeek 整理）：新增 ${ai.inserted}，跳过 ${ai.skipped}，错误 ${ai.errors.length}`,
            session.u,
            clientIp(req),
          );
          return NextResponse.json({
            ok: true,
            entity: ai.entity,
            label,
            total: rows.length,
            inserted: ai.inserted,
            skipped: ai.skipped,
            errors: ai.errors,
            notes: [`由 DeepSeek 整理后导入（${ai.batches} 批）`],
            detected: { entity: ai.entity, label, matched: 0, total: 0, columns: [] },
          });
        }
      }
      if (!auto) {
        return NextResponse.json(
          {
            error:
              "没能识别出数据类型。请确认表头里有「姓名 / 部门 / 职位 / 课程名称 / 应聘职位」这类字段，或在下方按类型指定导入。",
          },
          { status: 422 },
        );
      }
      logAudit(
        "导入数据",
        `${auto.detected.label}（自动识别）：新增 ${auto.result.inserted}，跳过 ${auto.result.skipped}，错误 ${auto.result.errors.length}`,
        session.u,
        clientIp(req),
      );
      return NextResponse.json({ ok: true, ...auto.result, detected: auto.detected });
    }

    const result = importRows(entityKey, rows);
    logAudit("导入数据", `${result.label}：新增 ${result.inserted}，跳过 ${result.skipped}，错误 ${result.errors.length}`, session.u, clientIp(req));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "导入失败";
    return NextResponse.json({ error: `导入失败：${message}` }, { status: 500 });
  }
}
