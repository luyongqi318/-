import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  Clock3,
  FileWarning,
  GraduationCap,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { BarList, Donut, Funnel, MiniBars, StatCard } from "@/components/charts";
import { Badge, PageHeader } from "@/components/ui";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const d = getDashboard();
  const k = d.kpi;

  const todos: { icon: React.ReactNode; title: string; meta: string; tone: string }[] = [
    ...d.todos.expiringContracts.map((c: any) => ({
      icon: <FileWarning size={14} />,
      title: `${c.name} · 合同 ${c.contract_end} 到期`,
      meta: `${c.department} · ${c.position}`,
      tone: "amber",
    })),
    ...d.todos.overdueTraining.map((t: any) => ({
      icon: <AlertTriangle size={14} />,
      title: `${t.employee} · ${t.course} 已逾期`,
      meta: `截止 ${t.due_date}`,
      tone: "red",
    })),
    ...d.todos.probationEnding.map((p: any) => ({
      icon: <Clock3 size={14} />,
      title: `${p.name} · 试用期评估待办`,
      meta: `${p.department} · ${p.position} · 入职 ${p.hire_date}`,
      tone: "blue",
    })),
  ].slice(0, 7);

  return (
    <>
      <PageHeader
        title="人力资源数据看板"
        desc={`上海东锦江希尔顿逸林酒店 · 在编 ${k.headcount} 人 · 数据每 30 分钟同步一次`}
        actions={
          <>
            <a className="btn" href="/recruitment">
              <Briefcase size={15} /> 招聘看板
            </a>
            <a className="btn btn-primary" href="/agent">
              <TrendingUp size={15} /> 让 AI 分析
            </a>
          </>
        }
      />

      <div className="grid kpi-grid kpi-6">
        <StatCard
          label="在编员工"
          value={k.headcount}
          unit="人"
          icon={<Users />}
          hint={<>试用期 {k.probation} 人</>}
        />
        <StatCard
          label="待招职位"
          value={k.openJobs}
          unit="个"
          icon={<Briefcase />}
          hint={<>缺口 {k.openings} 人待补</>}
        />
        <StatCard
          label="本月入职"
          value={k.newHires}
          unit="人"
          icon={<UserPlus />}
          hint={<>年度离职率 {k.turnover}%</>}
        />
        <StatCard
          label="培训完成率"
          value={k.trainingRate}
          unit="%"
          icon={<GraduationCap />}
          hint={<>逾期 {k.trainingOverdue} 条待跟进</>}
        />
        <StatCard
          label="今日出勤率"
          value={k.attendanceRate}
          unit="%"
          icon={<CalendarDays />}
          hint={<>按今日已打卡统计</>}
        />
        <StatCard
          label="绩效达标率"
          value={k.performancePass}
          unit="%"
          icon={<Target />}
          hint={<>{k.performancePeriod} · 均分 {k.performanceAvg}</>}
        />
      </div>

      <div className="two-col-wide section-gap">
        <div className="grid" style={{ gap: 16 }}>
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">
                <Users /> 部门人数分布
              </h2>
              <span className="card-sub">在编 / 编制</span>
            </div>
            <BarList
              items={d.departments.map((dep: any) => ({
                label: dep.name,
                value: dep.n,
                color: dep.color,
              }))}
              max={Math.max(1, ...d.departments.map((x: any) => x.target_headcount))}
            />
            <div style={{ padding: "0 20px 16px", fontSize: 11.5, color: "#7b8aa0" }}>
              编制总数 {d.departments.reduce((s: number, x: any) => s + x.target_headcount, 0)} 人 · 在编{" "}
              {d.departments.reduce((s: number, x: any) => s + x.n, 0)} 人 · 整体满编率{" "}
              {Math.round(
                (d.departments.reduce((s: number, x: any) => s + x.n, 0) /
                  Math.max(1, d.departments.reduce((s: number, x: any) => s + x.target_headcount, 0))) *
                  100,
              )}
              %
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">
                <TrendingUp /> 招聘漏斗
              </h2>
              <span className="card-sub">近 45 天累计</span>
            </div>
            <Funnel items={d.funnel} />
          </section>
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">
                <GraduationCap /> 培训完成率
              </h2>
              <span className="card-sub">全部学习任务</span>
            </div>
            <div className="donut-wrap">
              <Donut value={k.trainingRate} centerSub="已完成" color="#1f4f6b" />
              <div className="donut-legend">
                <div>
                  <span className="legend-dot" style={{ background: "#1f4f6b" }} />
                  已完成 {k.trainingRate}%
                </div>
                <div>
                  <span className="legend-dot" style={{ background: "#edf1f6" }} />
                  未完成 {100 - k.trainingRate}%
                </div>
                <div style={{ color: "#b42323" }}>逾期 {k.trainingOverdue} 条</div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">
                <AlertTriangle /> 今日待办
              </h2>
              <span className="card-sub">{todos.length} 项</span>
            </div>
            <div className="todo-list">
              {todos.length === 0 ? <div className="empty">暂无待办，保持得不错</div> : null}
              {todos.map((t, i) => (
                <div className="todo-item" key={i}>
                  <span
                    className="todo-icon"
                    style={{
                      background:
                        t.tone === "red" ? "#fdeaea" : t.tone === "amber" ? "#fdf1dd" : "#e8f1fb",
                      color: t.tone === "red" ? "#b42323" : t.tone === "amber" ? "#a86400" : "#1a5c96",
                    }}
                  >
                    {t.icon}
                  </span>
                  <div className="todo-main">
                    <b>{t.title}</b>
                    <span>{t.meta}</span>
                  </div>
                  <Badge tone={t.tone}>处理</Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <UserPlus /> 近 6 个月入职趋势
            </h2>
            <span className="card-sub">按入职日期统计</span>
          </div>
          <MiniBars items={d.trend} />
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <CalendarDays /> 近期面试安排
            </h2>
            <a className="card-sub" href="/recruitment">
              查看全部 →
            </a>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>候选人</th>
                  <th>应聘职位</th>
                  <th>时间</th>
                  <th>面试官</th>
                  <th>方式</th>
                </tr>
              </thead>
              <tbody>
                {d.upcoming.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      本周暂无面试安排
                    </td>
                  </tr>
                ) : null}
                {d.upcoming.map((it: any) => (
                  <tr key={it.id}>
                    <td className="cell-main">{it.candidate}</td>
                    <td>{it.job}</td>
                    <td className="num">{it.scheduled_at}</td>
                    <td>{it.interviewer}</td>
                    <td>
                      <Badge>{it.mode}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
