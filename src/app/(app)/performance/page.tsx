import { Award, ClipboardCheck, Target, TrendingUp } from "lucide-react";
import { BarList, StatCard } from "@/components/charts";
import { Badge, PageHeader } from "@/components/ui";
import { getPerformance } from "@/lib/queries";

export const dynamic = "force-dynamic";

const GRADE_COLOR: Record<string, string> = {
  A: "#2c6a58",
  B: "#2a5f86",
  C: "#b08d57",
  D: "#9e3b3b",
};

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const p = getPerformance(sp.period);
  const reviews = p.reviews as any[];
  const pending = reviews.filter((r) => r.status !== "已确认").slice(0, 5);

  return (
    <>
      <PageHeader
        title="绩效评估"
        desc={`${p.selected} 周期 · 参评 ${p.stats.total} 人 · 平均 ${p.stats.avg} 分 · 达标率 ${p.stats.passRate}%`}
      />

      <div className="grid kpi-grid">
        <StatCard label="参评人数" value={p.stats.total} unit="人" icon={<ClipboardCheck />} hint={<>覆盖率 100%</>} />
        <StatCard label="平均分" value={p.stats.avg} icon={<Target />} hint={<>满分 100 分</>} />
        <StatCard label="达标率" value={p.stats.passRate} unit="%" icon={<TrendingUp />} hint={<>80 分及以上</>} />
        <StatCard label="待面谈" value={p.stats.pending} unit="人" icon={<Award />} hint={<>需主管完成反馈</>} />
      </div>

      <section className="card section-gap">
        <div className="card-head">
          <h2 className="card-title">
            <Target /> 评估周期
          </h2>
          <span className="card-sub">按季度归档</span>
        </div>
        <div className="filters">
          {p.periods.map((period) => (
            <a
              key={period}
              href={`/performance?period=${encodeURIComponent(period)}`}
              className={`btn${p.selected === period ? " btn-primary" : ""}`}
              style={{ padding: "5px 12px", fontSize: 11.5 }}
            >
              {period}
            </a>
          ))}
        </div>
      </section>

      <div className="two-col-wide section-gap">
        <div className="grid" style={{ gap: 18 }}>
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">
                <Award /> 等级分布
              </h2>
              <span className="card-sub">A ≥ 90 · B ≥ 80 · C ≥ 70 · D &lt; 70</span>
            </div>
            <BarList
              items={p.dist.map((d) => ({ label: `${d.grade} 级`, value: d.value, color: GRADE_COLOR[d.grade] }))}
              valueSuffix=" 人"
            />
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">
                <TrendingUp /> 部门平均分
              </h2>
              <span className="card-sub">按当前周期</span>
            </div>
            <BarList
              items={(p.byDept as any[]).map((d) => ({ label: d.department, value: d.avg }))}
              max={100}
              valueSuffix=" 分"
            />
          </section>
        </div>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <ClipboardCheck /> 待面谈名单
            </h2>
            <span className="card-sub">{pending.length} 人</span>
          </div>
          <div className="todo-list" style={{ paddingTop: 8 }}>
            {pending.length === 0 ? <div className="empty">全部已确认</div> : null}
            {pending.map((r) => (
              <div className="todo-item" key={r.id}>
                <span className="todo-icon" style={{ background: "#f4ecdc", color: "#856a3a" }}>
                  {r.grade}
                </span>
                <div className="todo-main">
                  <b>
                    {r.employee} · {r.score} 分
                  </b>
                  <span>
                    {r.department} · 评估人 {r.reviewer}
                  </span>
                </div>
                <Badge>{r.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card section-gap">
        <div className="card-head">
          <h2 className="card-title">
            <ClipboardCheck /> 员工评估明细
          </h2>
          <span className="card-sub">{reviews.length} 条记录</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>员工</th>
                <th>部门</th>
                <th>职位</th>
                <th>评分</th>
                <th>等级</th>
                <th>评估人</th>
                <th>状态</th>
                <th>评语</th>
              </tr>
            </thead>
            <tbody>
              {reviews.slice(0, 30).map((r: any) => (
                <tr key={r.id}>
                  <td className="cell-main">{r.employee}</td>
                  <td className="cell-sub">{r.department}</td>
                  <td className="cell-sub">{r.position}</td>
                  <td className="num">{r.score}</td>
                  <td>
                    <Badge>{r.grade}</Badge>
                  </td>
                  <td className="cell-sub">{r.reviewer}</td>
                  <td>
                    <Badge>{r.status}</Badge>
                  </td>
                  <td
                    className="cell-sub"
                    style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis" }}
                    title={r.comment}
                  >
                    {r.comment}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
