import { ENTITIES } from "./import-schema";
import { getAgentConfig } from "./settings";

type Row = Record<string, string>;

/**
 * 规则匹配失败时，把表格内容交给模型整理成标准记录（只返回数据，不直接入库），
 * 由调用方决定覆盖还是追加。列名、日期格式、部门写法都可以不标准。
 */
export async function aiNormalizeImport(
  headers: string[],
  rows: Row[],
): Promise<{ entity: string; records: Record<string, string>[]; batches: number } | null> {
  const config = getAgentConfig();
  if (!config.apiKey) return null;

  const catalogue = ENTITIES.map((entity) => ({ key: entity.key, label: entity.label, fields: [...entity.headers] }));
  const batchSize = 50;
  const maxBatches = 8;
  const batches = Math.min(maxBatches, Math.ceil(rows.length / batchSize));

  let entityKey = "";
  const records: Record<string, string>[] = [];

  for (let b = 0; b < batches; b += 1) {
    const slice = rows.slice(b * batchSize, (b + 1) * batchSize);
    const prompt = [
      "你是酒店 HR 数据整理助手。把下面的表格行整理成标准 JSON，供系统入库。",
      `可选数据类型与标准字段：${JSON.stringify(catalogue)}`,
      `表头：${JSON.stringify(headers)}`,
      `数据行：${JSON.stringify(slice)}`,
      "要求：",
      "1. 先判断这批数据属于哪种类型，填在 entity 里；",
      "2. records 是数组，每个对象只用该类型的标准字段名（中文），值统一成字符串；",
      "3. 日期一律转成 YYYY-MM-DD（例如 01-Jul-2019 → 2019-07-01）；",
      "4. 缺的字段留空字符串，不要编造；部门、职位保留原文；",
      '5. 只输出 JSON：{"entity":"employees","records":[{...}]}，不要解释。',
    ].join("\n");

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      const text = String(data?.choices?.[0]?.message?.content ?? "");
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]) as { entity?: string; records?: Record<string, string>[] };
      const target = parsed.entity ? ENTITIES.find((e) => e.key === parsed.entity) : null;
      if (!target || !Array.isArray(parsed.records) || parsed.records.length === 0) return null;
      if (!entityKey) entityKey = target.key;
      if (entityKey !== target.key) continue;
      records.push(...parsed.records);
    } catch {
      return null;
    }
  }

  return entityKey && records.length ? { entity: entityKey, records, batches } : null;
}
