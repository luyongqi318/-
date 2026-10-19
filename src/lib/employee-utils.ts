/** 手工录入与导入共用的日期规范化：支持 2026-1-5、2026/01/05、2026年1月5日。 */
export function normalizeDateSafe(raw: string): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  const cleaned = value.replace(/[年月]/g, "-").replace(/日/g, "").replace(/[./]/g, "-");
  const match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return "";
  const [, y, m, d] = match;
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
