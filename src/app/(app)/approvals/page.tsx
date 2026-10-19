import { CheckCircle2, ClipboardCheck, Clock, XCircle } from "lucide-react";
import { ApprovalActions } from "@/components/ApprovalActions";
import { StatCard } from "@/components/charts";
import { CreateApprovalDialog } from "@/components/CreateApprovalDialog";
import { Badge, PageHeader } from "@/components/ui";
import { approvalStats, listApprovals } from "@/lib/approvals";
import { getEmployees } from "@/lib/queries";

export const dynamic = "force-dynamic";

const FILTERS = ["待审批", "已通过", "已驳回", "全部"];

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status ?? "") ? (sp.status as string) : "待审批";
  const rows = listApprovals(status === "全部" ? undefined : status);
  const stats = approvalStats();
  const employees = [...getEmployees({ status: "在职" }), ...getEmployees({ status: "试用期" })].map((e) => ({
    id: e.id,
    name: e.name,
  }));

  return (
    <>
      <PageHeader
        title="审批中心"
        desc="请假、加班、调班、转正、离职与培训申请，统一提交、审批并自动通知"
        eyebrow="DoubleTree · Approvals"
        actions={<CreateApprovalDialog employees={employees} />}
      />

      <div className="grid kpi-grid">
        <StatCard label="待审批" value={stats.pending} unit="单" icon={<Clock />} hint={<>审批人会收到邮件通知</>} />
        <StatCard label="本月通过" value={stats.approved} unit="单" icon={<CheckCircle2 />} hint={<>结果自动通知申请人</>} />
        <StatCard label="本月驳回" value={stats.rejected} unit="单" icon={<XCircle />} hint={<>附带审批意见</>} />
        <StatCard label="累计申请" value={stats.total} unit="单" icon={<ClipboardCheck />} hint={<>全流程留痕</>} />
      </div>

      <section className="card section-gap">
        <div className="card-head">
          <h2 className="card-title">
            <ClipboardCheck /> 审批单
          </h2>
          <span className="card-sub">{rows.length} 条</span>
        </div>
        <div className="filters">
          {FILTERS.map((f) => (
            <a
              key={f}
              href={`/approvals?status=${encodeURIComponent(f)}`}
              className={`btn${status === f ? " btn-primary" : ""}`}
              style={{ padding: "5px 12px", fontSize: 11.5 }}
            >
              {f}
            </a>
          ))}
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>类型</th>
                <th>标题</th>
                <th>申请人</th>
                <th>日期</th>
                <th>数量</th>
                <th>状态</th>
                <th>审批人 / 意见</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Badge tone="gold">{row.type}</Badge>
                  </td>
                  <td className="cell-main">{row.title}</td>
                  <td>{row.requester}</td>
                  <td className="num cell-sub">
                    {row.startDate || "—"}
                    {row.endDate && row.endDate !== row.startDate ? ` → ${row.endDate}` : ""}
                  </td>
                  <td className="num">{row.amount ?? "—"}</td>
                  <td>
                    <Badge tone={row.status === "待审批" ? "amber" : row.status === "已通过" ? "green" : "red"}>{row.status}</Badge>
                  </td>
                  <td className="cell-sub">
                    {row.approver || "—"}
                    {row.comment ? `：${row.comment}` : ""}
                  </td>
                  <td>
                    <ApprovalActions id={row.id} status={row.status} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    这个状态下没有审批单
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
