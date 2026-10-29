import * as XLSX from "xlsx";
import { listCertificates } from "./admin";
import { listApprovals } from "./approvals";
import { getApprovalsCount } from "./counts";
import { getCandidates, getEmployees, getJobs, getPerformance, getScheduling, getTraining } from "./queries";

export type SheetInfo = { name: string; rows: number };

export function buildWorkbook(): { buffer: Buffer; sheets: SheetInfo[] } {
  const wb = XLSX.utils.book_new();
  const sheets: SheetInfo[] = [];

  const employees = getEmployees().map((e) => ({
    工号: e.emp_no,
    姓名: e.name,
    英文名: (e as { english_name?: string }).english_name ?? "",
    部门: e.department,
    职位: e.position,
    入职日期: e.hire_date,
    状态: e.status,
    合同到期: e.contract_end ?? "",
    电话: e.phone ?? "",
  }));

  const jobs = getJobs().map((j) => ({
    职位: j.title,
    部门: j.department,
    需求人数: j.headcount,
    已招: j.filled,
    缺口: Math.max(0, j.headcount - j.filled),
    状态: j.status,
    优先级: j.priority,
    候选人数: j.applicants,
  }));

  const candidates = getCandidates().map((c) => ({
    姓名: c.name,
    应聘职位: c.job,
    阶段: c.stage,
    来源: c.source,
    投递日期: c.applied_at,
  }));

  const training = getTraining();
  const enrollments = (training.enrollments as any[]).map((e) => ({
    员工: e.employee,
    部门: e.department,
    课程: e.course,
    状态: e.status,
    进度: e.progress,
    截止日期: e.due_at,
  }));

  const performance = getPerformance();
  const reviews = (performance.reviews as any[]).map((r) => ({
    员工: r.employee,
    部门: r.department,
    周期: r.period,
    分数: r.score,
    等级: r.grade,
  }));

  const certificates = listCertificates().map((c) => ({
    员工: c.employee,
    部门: c.department,
    证照: c.type,
    到期日期: c.expiresAt,
    剩余天数: c.daysLeft,
    状态: c.daysLeft < 0 ? "已过期" : c.daysLeft <= 30 ? "30 天内到期" : "正常",
  }));

  const approvals = listApprovals().map((a) => ({
    类型: a.type,
    标题: a.title,
    申请人: a.requester,
    开始: a.startDate,
    结束: a.endDate,
    状态: a.status,
    审批人: a.approver,
    意见: a.comment,
  }));

  const plan: [string, Record<string, unknown>[]][] = [
    ["员工花名册", employees],
    ["招聘进展", jobs],
    ["候选人", candidates],
    ["培训完成", enrollments],
    ["绩效评估", reviews],
    ["证照预警", certificates],
    ["审批记录", approvals],
  ];

  for (const [name, rows] of plan) {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 说明: "暂无数据" }]);
    XLSX.utils.book_append_sheet(wb, sheet, name);
    sheets.push({ name, rows: rows.length });
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return { buffer, sheets };
}

export function reportSummary(): { sheets: SheetInfo[]; approvals: number } {
  const employees = getEmployees().length;
  const jobs = getJobs().length;
  const candidates = getCandidates().length;
  const training = (getTraining().enrollments as any[]).length;
  const reviews = (getPerformance().reviews as any[]).length;
  const certs = listCertificates().length;
  const approvals = getApprovalsCount();
  return {
    sheets: [
      { name: "员工花名册", rows: employees },
      { name: "招聘进展", rows: jobs },
      { name: "候选人", rows: candidates },
      { name: "培训完成", rows: training },
      { name: "绩效评估", rows: reviews },
      { name: "证照预警", rows: certs },
      { name: "审批记录", rows: approvals },
    ],
    approvals,
  };
}
