import { AlertTriangle, BookOpen, CheckCircle2, Clock, Download, GraduationCap } from "lucide-react";
import { StatCard } from "@/components/charts";
import { AssignTrainingDialog } from "@/components/AssignTrainingDialog";
import { Badge, PageHeader, Progress } from "@/components/ui";
import { getEmployees, getTraining } from "@/lib/queries";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "全部", label: "全部任务" },
  { key: "已逾期", label: "已逾期" },
  { key: "学习中", label: "学习中" },
  { key: "未开始", label: "未开始" },
  { key: "已完成", label: "已完成" },
];

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "全部" } = await searchParams;
  const data = getTraining();
  const courses = data.courses as any[];
  const enrollments = (data.enrollments as any[]).filter((e) => status === "全部" || e.status === status);
  const employees = getEmployees({ status: "在职" })
    .concat(getEmployees({ status: "试用期" }))
    .map((e) => ({ id: e.id, name: e.name, department: e.department }));
  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title }));

  return (
    <>
      <PageHeader
        title="培训与入职"
        desc={`${courses.length} 门课程 · ${data.stats.total} 项学习任务 · 完成率 ${data.stats.rate}%`}
        actions={
          <>
            <a className="btn" href="/api/export?type=training">
              <Download size={15} /> 导出培训任务
            </a>
            <AssignTrainingDialog employees={employees} courses={courseOptions} />
          </>
        }
      />

      <div className="grid kpi-grid">
        <StatCard label="课程总数" value={courses.length} unit="门" icon={<BookOpen />} hint={<>含 {courses.filter((c) => c.mandatory).length} 门必修</>} />
        <StatCard label="学习任务" value={data.stats.total} unit="项" icon={<GraduationCap />} hint={<>学习中 {data.stats.learning} 项</>} />
        <StatCard
          label="完成率"
          value={data.stats.rate}
          unit="%"
          icon={<CheckCircle2 />}
          hint={<>已完成 {data.stats.done} 项</>}
        />
        <StatCard
          label="逾期任务"
          value={data.stats.overdue}
          unit="项"
          icon={<AlertTriangle />}
          hint={<span style={{ color: "#9e3b3b" }}>需在本周跟进</span>}
        />
      </div>

      <section className="section-gap">
        <div className="section-title">
          <h2>课程目录</h2>
          <span>按必修优先排序</span>
        </div>
        <div className="course-grid">
          {courses.map((c) => {
            const rate = c.enrolled ? Math.round((c.completed / c.enrolled) * 100) : 0;
            return (
              <div className="card course" key={c.id}>
                <div className="course-top">
                  <div className="course-title">{c.title}</div>
                  {c.mandatory ? <Badge tone="gold">必修</Badge> : <Badge tone="gray">选修</Badge>}
                </div>
                <div className="course-desc">{c.description}</div>
                <div className="course-meta">
                  <span>{c.category}</span>
                  <span>·</span>
                  <span>{c.duration_min} 分钟</span>
                  <span>·</span>
                  <span>
                    {c.completed}/{c.enrolled} 完成
                  </span>
                </div>
                <div className="flex" style={{ gap: 10 }}>
                  <div className="grow">
                    <Progress value={rate} tone={rate >= 70 ? "green" : rate >= 40 ? undefined : "amber"} />
                  </div>
                  <span className="cell-sub num" style={{ width: 34, textAlign: "right" }}>
                    {rate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card section-gap">
        <div className="card-head">
          <h2 className="card-title">
            <Clock /> 学习任务明细
          </h2>
          <span className="card-sub">{enrollments.length} 条</span>
        </div>
        <div className="filters">
          {FILTERS.map((f) => (
            <a
              key={f.key}
              href={`/training?status=${encodeURIComponent(f.key)}`}
              className={`btn${status === f.key ? " btn-primary" : ""}`}
              style={{ padding: "5px 12px", fontSize: 11.5 }}
            >
              {f.label}
            </a>
          ))}
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>员工</th>
                <th>部门</th>
                <th>课程</th>
                <th>进度</th>
                <th>状态</th>
                <th>截止日期</th>
                <th>成绩</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.slice(0, 40).map((e) => (
                <tr key={e.id}>
                  <td className="cell-main">{e.employee}</td>
                  <td className="cell-sub">{e.department}</td>
                  <td>{e.course}</td>
                  <td style={{ minWidth: 120 }}>
                    <div className="flex">
                      <Progress
                        value={e.progress}
                        tone={e.status === "已逾期" ? "red" : e.status === "已完成" ? "green" : undefined}
                      />
                      <span className="cell-sub num" style={{ width: 34 }}>
                        {e.progress}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <Badge>{e.status}</Badge>
                  </td>
                  <td className="num cell-sub">{e.due_date}</td>
                  <td className="num">{e.score ?? "—"}</td>
                </tr>
              ))}
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    该状态下暂无任务
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card section-gap">
        <div className="card-head">
          <h2 className="card-title">
            <GraduationCap /> 新员工入职必修清单
          </h2>
          <span className="card-sub">入职 30 天内完成</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>课程</th>
                <th>适用对象</th>
                <th>时长</th>
                <th>完成要求</th>
              </tr>
            </thead>
            <tbody>
              {courses
                .filter((c) => c.mandatory)
                .map((c) => (
                  <tr key={`req-${c.id}`}>
                    <td className="cell-main">{c.title}</td>
                    <td className="cell-sub">
                      {c.category === "岗位技能" ? "客房 / 餐饮岗位" : c.category === "安全合规" ? "全体 + 餐饮厨房" : "全体新员工"}
                    </td>
                    <td className="num">{c.duration_min} 分钟</td>
                    <td>
                      <Badge tone="gold">通过考核 ≥ 80 分</Badge>
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
