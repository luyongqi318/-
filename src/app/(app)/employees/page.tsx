import { CalendarClock, FileWarning, Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/charts";
import { Avatar, Badge, PageHeader } from "@/components/ui";
import { getDepartments, getEmployeeStats, getEmployees } from "@/lib/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 18;

function tenure(hire: string) {
  const d = new Date(`${hire}T00:00:00`);
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  months = Math.max(0, months);
  const y = Math.floor(months / 12);
  const m = months % 12;
  return y > 0 ? `${y} 年 ${m} 个月` : `${m} 个月`;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const dept = Number(sp.dept) || 0;
  const status = sp.status ?? "全部";
  const page = Math.max(1, Number(sp.page) || 1);

  const all = getEmployees({ q, dept, status });
  const rows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const departments = getDepartments();
  const stats = getEmployeeStats();
  const qs = (next: Record<string, string | number>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (dept) params.set("dept", String(dept));
    if (status && status !== "全部") params.set("status", status);
    Object.entries(next).forEach(([k, v]) => params.set(k, String(v)));
    return `/employees?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="员工档案"
        desc={`在编 ${stats.head} 人 · 试用期 ${stats.probation} 人 · 合同 30 天内到期 ${stats.expiring} 人`}
      />

      <div className="grid kpi-grid">
        <StatCard label="在编员工" value={stats.head} unit="人" icon={<Users />} hint={<>覆盖 {departments.length} 个部门</>} />
        <StatCard label="试用期员工" value={stats.probation} unit="人" icon={<UserPlus />} hint={<>转正评估需提前 15 天</>} />
        <StatCard label="本月入职" value={stats.newHires} unit="人" icon={<CalendarClock />} hint={<>入职引导进行中</>} />
        <StatCard label="合同到期" value={stats.expiring} unit="人" icon={<FileWarning />} hint={<>30 天内需发起续签</>} />
      </div>

      <section className="card section-gap">
        <form className="filters" action="/employees" method="get">
          <div className="flex grow" style={{ minWidth: 240 }}>
            <Search size={15} color="#78838f" />
            <input className="input grow" name="q" defaultValue={q} placeholder="搜索姓名、工号或职位" style={{ minWidth: 180 }} />
          </div>
          <select className="select" name="dept" defaultValue={String(dept)}>
            <option value="0">全部部门</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select className="select" name="status" defaultValue={status}>
            <option>全部</option>
            <option>在职</option>
            <option>试用期</option>
            <option>离职</option>
          </select>
          <button className="btn btn-primary" type="submit">
            筛选
          </button>
          {q || dept || status !== "全部" ? (
            <a className="btn btn-ghost" href="/employees">
              清除
            </a>
          ) : null}
          <span className="card-sub" style={{ marginLeft: "auto" }}>
            共 {all.length} 人
          </span>
        </form>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>员工</th>
                <th>部门</th>
                <th>职位</th>
                <th>级别</th>
                <th>入职日期</th>
                <th>司龄</th>
                <th>状态</th>
                <th>合同到期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="flex">
                      <Avatar name={e.name} color={e.dept_color} />
                      <div>
                        <div className="cell-main">{e.name}</div>
                        <div className="cell-sub num">{e.emp_no}</div>
                      </div>
                    </div>
                  </td>
                  <td>{e.department}</td>
                  <td>{e.position}</td>
                  <td className="cell-sub">{e.level}</td>
                  <td className="num cell-sub">{e.hire_date}</td>
                  <td className="cell-sub">{tenure(e.hire_date)}</td>
                  <td>
                    <Badge>{e.status}</Badge>
                  </td>
                  <td className="num cell-sub">{e.contract_end ?? "—"}</td>
                  <td>
                    <Link className="btn btn-ghost" href={`/employees/${e.id}`} style={{ padding: "0 4px" }}>
                      查看档案
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty">
                    没有匹配的员工，换个关键词试试
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="filters" style={{ borderTop: "1px solid var(--line)", borderBottom: "none" }}>
            <span className="card-sub">
              第 {page} / {totalPages} 页
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {page > 1 ? (
                <a className="btn" href={qs({ page: page - 1 })}>
                  上一页
                </a>
              ) : null}
              {page < totalPages ? (
                <a className="btn" href={qs({ page: page + 1 })}>
                  下一页
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
