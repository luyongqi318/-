import { ScrollText, ShieldCheck } from "lucide-react";
import { Badge, PageHeader } from "@/components/ui";
import { auditActions, listAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  } catch {
    return ts;
  }
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action } = await searchParams;
  const actions = auditActions();
  const selected = action && actions.includes(action) ? action : "";
  const rows = listAudit(200, selected || undefined);

  return (
    <>
      <PageHeader
        title="审计日志"
        desc="谁在什么时候改了什么，全部留痕；导出、导入、改密、备份都会记录"
        eyebrow="DoubleTree · Audit"
        actions={
          <span className="badge badge-green badge-dot">
            <ShieldCheck size={12} /> 已启用
          </span>
        }
      />

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">
            <ScrollText /> 操作记录
          </h2>
          <span className="card-sub">最近 {rows.length} 条</span>
        </div>

        <div className="filters">
          <a className={`btn${selected === "" ? " btn-primary" : ""}`} href="/audit" style={{ padding: "5px 12px", fontSize: 11.5 }}>
            全部
          </a>
          {actions.slice(0, 8).map((item) => (
            <a
              key={item}
              className={`btn${selected === item ? " btn-primary" : ""}`}
              href={`/audit?action=${encodeURIComponent(item)}`}
              style={{ padding: "5px 12px", fontSize: 11.5 }}
            >
              {item}
            </a>
          ))}
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>时间</th>
                <th>操作人</th>
                <th>动作</th>
                <th>详情</th>
                <th>来源 IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="num cell-sub">{fmt(row.ts)}</td>
                  <td className="cell-main">{row.actor}</td>
                  <td>
                    <Badge tone={row.action.includes("失败") ? "red" : "blue"}>{row.action}</Badge>
                  </td>
                  <td style={{ whiteSpace: "normal", maxWidth: 520 }}>{row.detail}</td>
                  <td className="cell-sub num">{row.ip || "—"}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    还没有审计记录
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
