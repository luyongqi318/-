import { ArrowLeft, ArrowRight, CalendarDays, Clock3, UserCheck, UserX } from "lucide-react";
import { StatCard } from "@/components/charts";
import { Badge, PageHeader } from "@/components/ui";
import { addDays, getDepartments, getScheduling, iso, startOfWeek, todayIso } from "@/lib/queries";

export const dynamic = "force-dynamic";

const WEEKDAY = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function shiftClass(shift: string) {
  if (shift === "早班") return "shift-morning";
  if (shift === "中班") return "shift-mid";
  if (shift === "晚班") return "shift-night";
  return "shift-off";
}

export default async function SchedulingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; dept?: string }>;
}) {
  const sp = await searchParams;
  const deptId = Number(sp.dept) || 0;
  const base = sp.week ? new Date(`${sp.week}T00:00:00`) : startOfWeek(new Date());
  const weekStart = startOfWeek(base);
  const data = getScheduling(iso(weekStart), deptId);
  const departments = getDepartments();
  const today = todayIso();
  const prev = iso(addDays(weekStart, -7));
  const next = iso(addDays(weekStart, 7));
  const deptQuery = deptId ? `&dept=${deptId}` : "";

  const onDuty = data.attStats.normal + data.attStats.late;

  return (
    <>
      <PageHeader
        title="排班与考勤"
        desc={`本周 ${data.start} 起 · ${data.people.length} 名员工参与排班 · 今日出勤率 ${data.attStats.rate}%`}
        actions={
          <>
            <a className="btn" href={`/scheduling?week=${prev}${deptQuery}`}>
              <ArrowLeft size={15} /> 上一周
            </a>
            <a className="btn" href={`/scheduling?week=${next}${deptQuery}`}>
              下一周 <ArrowRight size={15} />
            </a>
          </>
        }
      />

      <div className="grid kpi-grid">
        <StatCard label="今日在岗" value={onDuty} unit="人" icon={<UserCheck />} hint={<>含迟到 {data.attStats.late} 人</>} />
        <StatCard label="今日出勤率" value={data.attStats.rate} unit="%" icon={<CalendarDays />} hint={<>按已打卡记录</>} />
        <StatCard label="迟到" value={data.attStats.late} unit="人" icon={<Clock3 />} hint={<>月累计 3 次进入提醒</>} />
        <StatCard
          label="请假 / 缺勤"
          value={`${data.attStats.leave} / ${data.attStats.absent}`}
          icon={<UserX />}
          hint={<>缺勤需当日补单</>}
        />
      </div>

      <section className="card section-gap">
        <div className="card-head">
          <h2 className="card-title">
            <CalendarDays /> 周排班表
          </h2>
          <span className="card-sub">
            {data.days[0]} 至 {data.days[6]}
          </span>
        </div>
        <form className="filters" action="/scheduling" method="get">
          <input type="hidden" name="week" value={iso(weekStart)} />
          <select className="select" name="dept" defaultValue={String(deptId)}>
            <option value="0">全部部门</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">
            应用筛选
          </button>
          <span className="card-sub" style={{ marginLeft: "auto" }}>
            早班 07:00–15:00 · 中班 15:00–23:00 · 晚班 23:00–07:00
          </span>
        </form>

        <div className="table-wrap">
          <div className="schedule">
            <div className="sch-cell sch-head sch-person">员工 / 日期</div>
            {data.days.map((d, i) => (
              <div className={`sch-cell sch-head${d === today ? " today" : ""}`} key={d}>
                {WEEKDAY[i]} · {d.slice(5)}
              </div>
            ))}
            {data.people.map((p) => (
              <div style={{ display: "contents" }} key={p.id}>
                <div className="sch-cell sch-person">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                    <div className="cell-sub">{p.department}</div>
                  </div>
                </div>
                {data.days.map((d) => {
                  const s = data.shifts.get(`${p.id}:${d}`);
                  return (
                    <div className="sch-cell" key={`${p.id}-${d}`}>
                      {s ? (
                        <span className={`shift-chip ${shiftClass(s.shift)}`}>
                          {s.shift}
                          {s.start_time ? <span style={{ opacity: 0.7 }}> {s.start_time}</span> : null}
                        </span>
                      ) : (
                        <span className="muted" style={{ fontSize: 11 }}>
                          —
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card section-gap">
        <div className="card-head">
          <h2 className="card-title">
            <Clock3 /> 今日考勤明细
          </h2>
          <span className="card-sub">{today}</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>员工</th>
                <th>部门</th>
                <th>上班打卡</th>
                <th>下班打卡</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {data.attendanceToday.slice(0, 20).map((a: any) => (
                <tr key={a.id}>
                  <td className="cell-main">{a.employee}</td>
                  <td className="cell-sub">{a.department}</td>
                  <td className="num">{a.clock_in || "—"}</td>
                  <td className="num">{a.clock_out || "—"}</td>
                  <td>
                    <Badge>{a.status}</Badge>
                  </td>
                </tr>
              ))}
              {data.attendanceToday.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    今日暂无打卡记录
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
