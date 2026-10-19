import { Inbox, Mail, Send, WifiOff } from "lucide-react";
import { ComposeDialog } from "@/components/ComposeDialog";
import { Badge, PageHeader } from "@/components/ui";
import { getSmtpConfig, listMessages } from "@/lib/mailer";
import { getEmployees } from "@/lib/queries";

export const dynamic = "force-dynamic";

function fmt(ts: string): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  } catch {
    return ts;
  }
}

export default async function MessagesPage() {
  const smtp = getSmtpConfig();
  const messages = listMessages(100);
  const employees = getEmployees()
    .filter((e) => Boolean(e.email))
    .map((e) => ({ id: e.id, name: e.name, email: String(e.email) }));

  const sent = messages.filter((m) => m.status === "已发送").length;
  const queued = messages.filter((m) => m.status === "待发送").length;
  const failed = messages.filter((m) => m.status === "失败").length;

  return (
    <>
      <PageHeader
        title="邮件中心"
        desc="面试邀约、培训提醒、审批通知与入职通知，统一从这里发出并留档"
        eyebrow="DoubleTree · Mail"
        actions={<ComposeDialog employees={employees} />}
      />

      <div className="grid kpi-grid">
        <div className="card stat">
          <div className="stat-label">已发送</div>
          <div className="stat-value">{sent}</div>
          <div className="stat-foot">SMTP 通道</div>
          <div className="stat-icon">
            <Send />
          </div>
        </div>
        <div className="card stat">
          <div className="stat-label">待发送</div>
          <div className="stat-value">{queued}</div>
          <div className="stat-foot">未配置 SMTP 时进入发件箱</div>
          <div className="stat-icon">
            <Inbox />
          </div>
        </div>
        <div className="card stat">
          <div className="stat-label">发送失败</div>
          <div className="stat-value">{failed}</div>
          <div className="stat-foot">可在系统设置检查 SMTP</div>
          <div className="stat-icon">
            <WifiOff />
          </div>
        </div>
      </div>

      <section className="card section-gap">
        <div className="card-head">
          <h2 className="card-title">
            <Mail /> 发件记录
          </h2>
          <span className={`badge ${smtp.configured ? "badge-green" : "badge-amber"} badge-dot`}>
            {smtp.configured ? `SMTP 已配置 · ${smtp.host}` : "SMTP 未配置 · 仅进发件箱"}
          </span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>时间</th>
                <th>收件人</th>
                <th>主题</th>
                <th>模板</th>
                <th>状态</th>
                <th>渠道</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td className="num cell-sub">{fmt(m.createdAt)}</td>
                  <td className="cell-main">
                    {m.toName ? `${m.toName} · ` : ""}
                    {m.to}
                  </td>
                  <td>{m.subject}</td>
                  <td className="cell-sub">{m.template || "自定义"}</td>
                  <td>
                    <Badge tone={m.status === "已发送" ? "green" : m.status === "失败" ? "red" : "amber"}>{m.status}</Badge>
                  </td>
                  <td className="cell-sub">{m.provider === "smtp" ? "SMTP" : "发件箱"}</td>
                </tr>
              ))}
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    还没有邮件记录
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
