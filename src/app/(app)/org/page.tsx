import { Building2, Crown, Target, Users } from "lucide-react";
import { Badge, PageHeader } from "@/components/ui";
import { getDashboard, getDepartments, getEmployees, getJobs } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function OrgPage() {
  const departments = getDepartments();
  const employees = getEmployees();
  const jobs = getJobs();
  const dashboard = getDashboard();

  const cards = departments.map((dept) => {
    const members = employees.filter((e) => e.department === dept.name && e.status !== "离职");
    const manager =
      members.find((m) => /总经理|总监/.test(m.position)) ??
      members.find((m) => /经理/.test(m.position)) ??
      members.sort((a, b) => (a.hire_date < b.hire_date ? -1 : 1))[0];
    const openRoles = jobs.filter((j) => j.department === dept.name && j.status === "招聘中");
    const openings = openRoles.reduce((sum, j) => sum + Math.max(0, j.headcount - j.filled), 0);
    return {
      id: dept.id,
      name: dept.name,
      color: dept.color || "#a98a54",
      headcount: members.length,
      target: dept.target_headcount ?? members.length,
      manager: manager?.name ?? "待指定",
      managerTitle: manager?.position ?? "",
      managerEnglish: (manager as { english_name?: string } | undefined)?.english_name ?? "",
      openRoles,
      openings,
    };
  });

  const totalStaff = cards.reduce((sum, c) => sum + c.headcount, 0);
  const totalOpen = cards.reduce((sum, c) => sum + c.openings, 0);
  const maxHeadcount = Math.max(...cards.map((c) => c.headcount), 1);

  return (
    <>
      <PageHeader
        title="组织架构"
        desc={`${cards.length} 个部门 · ${totalStaff} 名在编 · ${totalOpen} 个缺口，一眼看清谁在带队、哪里缺人`}
        eyebrow="DoubleTree · Organization"
        actions={
          <Badge tone="gold">
            编制 {cards.reduce((sum, c) => sum + c.target, 0)} 人 · 在编 {totalStaff} 人
          </Badge>
        }
      />

      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="flex" style={{ justifyContent: "space-between" }}>
            <span className="stat-label">部门数</span>
            <span className="stat-icon">
              <Building2 size={16} />
            </span>
          </div>
          <div className="stat-value">
            {cards.length}
            <small>个</small>
          </div>
          <div className="stat-foot">含物业</div>
        </div>
        <div className="stat">
          <div className="flex" style={{ justifyContent: "space-between" }}>
            <span className="stat-label">在编</span>
            <span className="stat-icon">
              <Users size={16} />
            </span>
          </div>
          <div className="stat-value">
            {totalStaff}
            <small>人</small>
          </div>
          <div className="stat-foot">不含离职</div>
        </div>
        <div className="stat">
          <div className="flex" style={{ justifyContent: "space-between" }}>
            <span className="stat-label">缺编</span>
            <span className="stat-icon">
              <Target size={16} />
            </span>
          </div>
          <div className="stat-value">
            {totalOpen}
            <small>人</small>
          </div>
          <div className="stat-foot">在招职位合计</div>
        </div>
        <div className="stat">
          <div className="flex" style={{ justifyContent: "space-between" }}>
            <span className="stat-label">平均部门规模</span>
            <span className="stat-icon">
              <Crown size={16} />
            </span>
          </div>
          <div className="stat-value">
            {cards.length ? Math.round(totalStaff / cards.length) : 0}
            <small>人</small>
          </div>
          <div className="stat-foot">按在编计算</div>
        </div>
      </div>

      <div className="grid cols-3">
        {cards.map((card) => (
          <section className="card card-pad org-card" key={card.id}>
            <div className="org-card-head">
              <span className="org-dot" style={{ background: card.color }} />
              <h2 className="org-name">{card.name}</h2>
              <Badge tone={card.openings > 0 ? "amber" : "green"}>{card.openings > 0 ? `缺 ${card.openings}` : "满编"}</Badge>
            </div>

            <div className="org-metrics">
              <div>
                <span className="org-metric-value">{card.headcount}</span>
                <span className="org-metric-label">在编 / 编制 {card.target}</span>
              </div>
              <div className="org-bar">
                <span style={{ width: `${Math.round((card.headcount / maxHeadcount) * 100)}%`, background: card.color }} />
              </div>
            </div>

            <div className="org-manager">
              <div className="org-avatar">{card.manager.slice(0, 1)}</div>
              <div>
                <div className="org-manager-name">
                  {card.manager}
                  {card.managerEnglish ? <span className="org-manager-en">{card.managerEnglish}</span> : null}
                </div>
                <div className="org-manager-title">{card.managerTitle || "部门负责人"}</div>
              </div>
            </div>

            {card.openRoles.length ? (
              <div className="org-roles">
                {card.openRoles.slice(0, 3).map((job) => (
                  <span key={job.id} className="org-role">
                    {job.title} · 缺 {Math.max(0, job.headcount - job.filled)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="org-roles">
                <span className="org-role muted">暂无在招职位</span>
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
