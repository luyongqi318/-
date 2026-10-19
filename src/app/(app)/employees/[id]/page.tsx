import { ArrowLeft, CalendarDays, GraduationCap, Mail, Phone, Target } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, PageHeader, Progress } from "@/components/ui";
import { getEmployee } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getEmployee(Number(id));
  if (!data) notFound();

  const { employee: e, enrollments, reviews, shifts, attendance } = data as any;
  const done = enrollments.filter((x: any) => x.status === "已完成").length;
  const rate = enrollments.length ? Math.round((done / enrollments.length) * 100) : 0;
  const latestReview = reviews[0];
  const attTotal = attendance.reduce((s: number, a: any) => s + a.n, 0);
  const attNormal = attendance.find((a: any) => a.status === "正常")?.n ?? 0;

  return (
    <>
      <PageHeader
        eyebrow={`Employee · ${e.emp_no}`}
        title={e.name}
        desc={`${e.department} · ${e.position} · ${e.level}`}
        actions={
          <Link className="btn" href="/employees">
            <ArrowLeft size={15} /> 返回花名册
          </Link>
        }
      />

      <div className="two-col-wide">
        <div className="grid" style={{ gap: 18 }}>
          <section className="card card-pad">
            <div className="flex" style={{ gap: 16, alignItems: "flex-start" }}>
              <div
                className="avatar-sm"
                style={{ width: 64, height: 64, borderRadius: 8, fontSize: 22, background: e.dept_color }}
              >
                {e.name.slice(0, 1)}
              </div>
              <div className="grow">
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: 0.5 }}>
                  {e.name} <Badge>{e.status}</Badge>
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  {e.department} · {e.position} · 入职 {e.hire_date}
                </div>
                <div className="flex" style={{ gap: 18, marginTop: 12, flexWrap: "wrap" }}>
                  <span className="flex muted" style={{ fontSize: 12 }}>
                    <Phone size={13} /> {e.phone}
                  </span>
                  <span className="flex muted" style={{ fontSize: 12 }}>
                    <Mail size={13} /> {e.email}
                  </span>
                  <span className="flex muted" style={{ fontSize: 12 }}>
                    <CalendarDays size={13} /> 合同到期 {e.contract_end ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">
                <GraduationCap /> 培训记录
              </h2>
              <span className="card-sub">
                完成 {done}/{enrollments.length}
              </span>
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>课程</th>
                    <th>进度</th>
                    <th>状态</th>
                    <th>截止</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.slice(0, 6).map((en: any) => (
                    <tr key={en.id}>
                      <td>{en.course}</td>
                      <td style={{ minWidth: 110 }}>
                        <Progress value={en.progress} tone={en.status === "已逾期" ? "red" : en.status === "已完成" ? "green" : undefined} />
                      </td>
                      <td>
                        <Badge>{en.status}</Badge>
                      </td>
                      <td className="num cell-sub">{en.due_date}</td>
                    </tr>
                  ))}
                  {enrollments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty">
                        暂无培训任务
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">
                <Target /> 绩效评估
              </h2>
              <span className="card-sub">{reviews.length} 个周期</span>
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>周期</th>
                    <th>评分</th>
                    <th>等级</th>
                    <th>评估人</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r: any) => (
                    <tr key={r.id}>
                      <td className="cell-main">{r.period}</td>
                      <td className="num">{r.score}</td>
                      <td>
                        <Badge>{r.grade}</Badge>
                      </td>
                      <td className="cell-sub">{r.reviewer}</td>
                      <td>
                        <Badge>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {reviews.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty">
                        暂无评估记录
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="grid" style={{ gap: 18 }}>
          <section className="card card-pad">
            <h2 className="card-title" style={{ marginBottom: 14 }}>
              <CalendarDays /> 出勤概览
            </h2>
            <div className="grid cols-2" style={{ gap: 12 }}>
              <div>
                <div className="stat-label">累计打卡</div>
                <div className="stat-value" style={{ fontSize: 26 }}>
                  {attTotal}
                  <small>次</small>
                </div>
              </div>
              <div>
                <div className="stat-label">正常出勤</div>
                <div className="stat-value" style={{ fontSize: 26 }}>
                  {attTotal ? Math.round((attNormal / attTotal) * 100) : 0}
                  <small>%</small>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="stat-label" style={{ marginBottom: 6 }}>
                近 7 天排班
              </div>
              <div className="pill-row">
                {shifts.map((s: any) => (
                  <span key={s.id} className={`shift-chip ${s.shift === "早班" ? "shift-morning" : s.shift === "中班" ? "shift-mid" : s.shift === "晚班" ? "shift-night" : "shift-off"}`}>
                    {s.work_date.slice(5)} {s.shift}
                  </span>
                ))}
                {shifts.length === 0 ? <span className="muted">暂无排班</span> : null}
              </div>
            </div>
          </section>

          <section className="card card-pad">
            <h2 className="card-title" style={{ marginBottom: 14 }}>
              <Target /> 最新绩效
            </h2>
            {latestReview ? (
              <>
                <div className="flex" style={{ gap: 14, alignItems: "baseline" }}>
                  <span style={{ fontSize: 40, fontWeight: 300, letterSpacing: -1 }}>{latestReview.score}</span>
                  <Badge>{latestReview.grade}</Badge>
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    {latestReview.period}
                  </span>
                </div>
                <p className="muted" style={{ fontSize: 12, lineHeight: 1.9, marginTop: 10 }}>
                  {latestReview.comment}
                </p>
                <div className="cell-sub">评估人：{latestReview.reviewer}</div>
              </>
            ) : (
              <div className="empty">暂无绩效记录</div>
            )}
          </section>

          <section className="card card-pad">
            <h2 className="card-title" style={{ marginBottom: 12 }}>
              <GraduationCap /> 培训完成度
            </h2>
            <div className="flex" style={{ gap: 12 }}>
              <div className="grow">
                <Progress value={rate} tone={rate >= 70 ? "green" : rate >= 40 ? undefined : "amber"} />
              </div>
              <span className="num" style={{ fontWeight: 600 }}>
                {rate}%
              </span>
            </div>
            <div className="cell-sub" style={{ marginTop: 8 }}>
              共 {enrollments.length} 门课程，完成 {done} 门
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
