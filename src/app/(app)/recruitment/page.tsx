import { Briefcase, CalendarDays, Timer, Users } from "lucide-react";
import { StatCard } from "@/components/charts";
import { CandidateStageSelect } from "@/components/CandidateStageSelect";
import { NewJobDialog } from "@/components/NewJobDialog";
import { Badge, PageHeader, Progress } from "@/components/ui";
import { getCandidates, getDepartments, getJobs, getRecruitmentStats, getUpcomingInterviews } from "@/lib/queries";

export const dynamic = "force-dynamic";

const STAGES = ["新投递", "简历筛选", "面试中", "待发 offer", "已入职"];

function stars(rating: number) {
  return "★".repeat(Math.max(1, Math.min(5, rating))) + "☆".repeat(Math.max(0, 5 - rating));
}

export default function RecruitmentPage() {
  const stats = getRecruitmentStats();
  const jobs = getJobs();
  const candidates = getCandidates();
  const departments = getDepartments().map((d) => ({ id: d.id, name: d.name }));
  const interviews = getUpcomingInterviews(6);

  return (
    <>
      <PageHeader
        title="招聘管理"
        desc={`在招 ${stats.openJobs} 个职位 · 累计候选人 ${stats.candidates} 人 · 平均招聘周期 ${stats.avgTimeToHire} 天`}
        actions={<NewJobDialog departments={departments} />}
      />

      <div className="grid kpi-grid">
        <StatCard label="在招职位" value={stats.openJobs} unit="个" icon={<Briefcase />} hint={<>缺口 {stats.remaining} 人待补</>} />
        <StatCard label="候选人总数" value={stats.candidates} unit="人" icon={<Users />} hint={<>推进中 {stats.active} 人</>} />
        <StatCard label="本周面试" value={stats.interviewsThisWeek} unit="场" icon={<CalendarDays />} hint={<>含初试与复试</>} />
        <StatCard label="平均招聘周期" value={stats.avgTimeToHire} unit="天" icon={<Timer />} hint={<>从投递到入职</>} />
      </div>

      <section className="card section-gap">
        <div className="card-head">
          <h2 className="card-title">
            <Users /> 候选人流程看板
          </h2>
          <span className="card-sub">按阶段汇总 · 可在明细表中调整阶段</span>
        </div>
        <div style={{ padding: "18px 22px 22px" }}>
          <div className="kanban">
            {STAGES.map((stage) => {
              const list = candidates.filter((c) => c.stage === stage);
              return (
                <div className="kanban-col" key={stage}>
                  <div className="kanban-head">
                    <span>{stage}</span>
                    <span className="kanban-count">{list.length}</span>
                  </div>
                  {list.slice(0, 4).map((c) => (
                    <div className="kcard" key={c.id}>
                      <div className="kcard-name">
                        <span>{c.name}</span>
                        <span className="stars" aria-label={`评分 ${c.rating}`}>
                          {stars(c.rating)}
                        </span>
                      </div>
                      <div className="kcard-job">
                        {c.job} · {c.department}
                      </div>
                      <div className="kcard-foot">
                        <span>{c.source}</span>
                        <span>{c.days_in_stage} 天</span>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 ? (
                    <div style={{ padding: "18px 6px", textAlign: "center", fontSize: 11, color: "#a7b0ba" }}>暂无</div>
                  ) : null}
                  {list.length > 4 ? (
                    <div style={{ textAlign: "center", fontSize: 10.5, color: "#7b8aa0", paddingTop: 4 }}>
                      还有 {list.length - 4} 人
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="two-col-wide section-gap">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <Briefcase /> 职位需求
            </h2>
            <span className="card-sub">{jobs.filter((j) => j.status === "招聘中").length} 个在招</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>职位</th>
                  <th>部门</th>
                  <th>需求</th>
                  <th>已招</th>
                  <th>进度</th>
                  <th>优先级</th>
                  <th>已挂</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="cell-main">{j.title}</td>
                    <td>{j.department}</td>
                    <td className="num">{j.headcount}</td>
                    <td className="num">{j.filled}</td>
                    <td style={{ minWidth: 110 }}>
                      <div className="flex">
                        <Progress value={(j.filled / Math.max(1, j.headcount)) * 100} tone={j.filled >= j.headcount ? "green" : undefined} />
                        <span className="cell-sub num" style={{ width: 34 }}>
                          {Math.round((j.filled / Math.max(1, j.headcount)) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge>{j.priority}</Badge>
                    </td>
                    <td className="num cell-sub">{j.days_open} 天</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <CalendarDays /> 近期面试
            </h2>
            <span className="card-sub">{interviews.length} 场</span>
          </div>
          <div className="todo-list" style={{ paddingTop: 8 }}>
            {interviews.length === 0 ? <div className="empty">暂无安排</div> : null}
            {interviews.map((it: any) => (
              <div className="todo-item" key={it.id}>
                <span className="todo-icon" style={{ background: "#f4ecdc", color: "#856a3a", fontSize: 11, fontWeight: 600 }}>
                  {it.round}
                </span>
                <div className="todo-main">
                  <b>
                    {it.candidate} · {it.job}
                  </b>
                  <span>
                    {it.scheduled_at} · {it.interviewer} · {it.mode}
                  </span>
                </div>
                <Badge tone="blue">待面试</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card section-gap">
        <div className="card-head">
          <h2 className="card-title">
            <Users /> 候选人明细
          </h2>
          <span className="card-sub">可直接调整阶段，刷新后看板同步更新</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>姓名</th>
                <th>应聘职位</th>
                <th>部门</th>
                <th>来源</th>
                <th>投递日期</th>
                <th>评分</th>
                <th>阶段</th>
              </tr>
            </thead>
            <tbody>
              {candidates.slice(0, 24).map((c) => (
                <tr key={c.id}>
                  <td className="cell-main">{c.name}</td>
                  <td>{c.job}</td>
                  <td className="cell-sub">{c.department}</td>
                  <td className="cell-sub">{c.source}</td>
                  <td className="num cell-sub">{c.applied_at}</td>
                  <td>
                    <span className="stars">{stars(c.rating)}</span>
                  </td>
                  <td>
                    <CandidateStageSelect id={c.id} stage={c.stage} />
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
