import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { ALL_HEADERS, ENTITIES, getEntity, importAuto, importRows, parseTable, remapRows } from "@/lib/import-schema";
import { clientIp } from "@/lib/rate-limit";
import { getAgentConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** 规则识别不了时，让模型判断类型与列映射；失败就返回 null，走人工指定。 */
async function classifyWithModel(
  headers: string[],
  sample: Record<string, string>[],
): Promise<{ entity: string; mapping: Record<string, string> } | null> {
  const config = getAgentConfig();
  if (!config.apiKey) return null;

  const catalogue = ENTITIES.map((entity) => ({ key: entity.key, label: entity.label, columns: [...entity.headers] }));
  const prompt = [
    "你是酒店 HR 数据分类器。根据文件表头和样例行，判断属于哪类数据，并把文件列映射到标准列。",
    `文件表头：${JSON.stringify(headers)}`,
    `样例行：${JSON.stringify(sample)}`,
    `可选类型与标准列：${JSON.stringify(catalogue)}`,
    '只输出 JSON，不要解释：{"entity":"employees","mapping":{"标准列":"文件列"}}；无法判断则输出 {"entity":null}。',
  ].join("\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 400,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as { entity?: string; mapping?: Record<string, string> };
    const entity = parsed.entity ? getEntity(parsed.entity) : null;
    if (!entity || !parsed.mapping) return null;
    const allowed = new Set(entity.headers as readonly string[]);
    const mapping: Record<string, string> = {};
    for (const [target, source] of Object.entries(parsed.mapping)) {
      if (allowed.has(target) && headers.includes(source)) mapping[target] = source;
    }
    return Object.keys(mapping).length >= 1 ? { entity: entity.key, mapping } : null;
  } catch {
    return null;
  }
}

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
      let auto = importAuto(headers, rows);
      if (!auto) {
        // 规则识别不出来时，交给模型判断属于哪类数据、列如何对应
        const ai = await classifyWithModel(headers, rows.slice(0, 3));
        if (ai) {
          const result = importRows(ai.entity, remapRows(rows, ai.mapping));
          auto = {
            result,
            detected: {
              entity: ai.entity,
              label: getEntity(ai.entity)?.label ?? ai.entity,
              matched: Object.keys(ai.mapping).length,
              total: getEntity(ai.entity)?.headers.length ?? 0,
              columns: Object.entries(ai.mapping).map(([target, source]) => ({ target, source })),
            },
          };
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
