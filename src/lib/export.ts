import { getCandidates, getEmployees, getTraining } from "./queries";

const BOM = "\uFEFF";

function toCsv(rows: (string | number | null | undefined)[][]): string {
  const escape = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return BOM + rows.map((row) => row.map(escape).join(",")).join("\r\n") + "\r\n";
}

export type ExportPayload = { csv: string; filename: string };

export function exportEmployees(): ExportPayload {
  const rows = getEmployees();
  const csv = toCsv([
    ["工号", "姓名", "性别", "部门", "职位", "级别", "入职日期", "状态", "合同到期", "月薪", "手机号", "邮箱"],
    ...rows.map((e) => [
      e.emp_no,
      e.name,
      e.gender,
      e.department,
      e.position,
      e.level,
      e.hire_date,
      e.status,
      e.contract_end ?? "",
      e.salary ?? "",
      e.phone,
      e.email ?? "",
    ]),
  ]);
  return { csv, filename: "员工花名册.csv" };
}

export function exportTraining(): ExportPayload {
  const { enrollments } = getTraining();
  const rows = enrollments as any[];
  const csv = toCsv([
    ["员工", "部门", "课程", "分类", "状态", "进度(%)", "成绩", "分配日期", "截止日期"],
    ...rows.map((e) => [e.employee, e.department, e.course, e.category, e.status, e.progress, e.score ?? "", e.assigned_at, e.due_date]),
  ]);
  return { csv, filename: "培训任务.csv" };
}

export function exportCandidates(): ExportPayload {
  const rows = getCandidates();
  const csv = toCsv([
    ["姓名", "应聘职位", "部门", "来源", "阶段", "评分", "投递日期", "入职日期", "备注"],
    ...rows.map((c) => [c.name, c.job, c.department, c.source, c.stage, c.rating, c.applied_at, c.hired_at ?? "", c.note ?? ""]),
  ]);
  return { csv, filename: "候选人.csv" };
}

export const EXPORTS: Record<string, () => ExportPayload> = {
  employees: exportEmployees,
  training: exportTraining,
  candidates: exportCandidates,
};
