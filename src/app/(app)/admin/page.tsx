import { BedDouble, IdCard, UserRoundCheck } from "lucide-react";
import {
  AddAgencyForm,
  AddCertificateForm,
  AddDormForm,
  AgencyStatusButton,
  CheckoutButton,
  RenewButton,
} from "@/components/AdminForms";
import { Badge, PageHeader } from "@/components/ui";
import { certificateStats, listAgency, listCertificates, listDorms } from "@/lib/admin";
import { getEmployees } from "@/lib/queries";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "certificates", label: "证照管理", icon: IdCard },
  { key: "dorms", label: "员工宿舍", icon: BedDouble },
  { key: "agency", label: "临时工台账", icon: UserRoundCheck },
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "certificates" } = await searchParams;
  const active = TABS.some((t) => t.key === tab) ? tab : "certificates";
  const employees = [...getEmployees({ status: "在职" }), ...getEmployees({ status: "试用期" })].map((e) => ({
    id: e.id,
    name: e.name,
  }));

  const certificates = listCertificates();
  const certStats = certificateStats();
  const dorms = listDorms();
  const agency = listAgency();

  return (
    <>
      <PageHeader
        title="行政台账"
        desc="健康证到期、员工宿舍、临时工用工，酒店人事日常最容易出问题的地方"
        eyebrow="DoubleTree · Administration"
        actions={
          active === "certificates" ? (
            <AddCertificateForm employees={employees} />
          ) : active === "dorms" ? (
            <AddDormForm employees={employees} />
          ) : (
            <AddAgencyForm />
          )
        }
      />

      <div className="filters" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 10, marginBottom: 18 }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <a key={t.key} href={`/admin?tab=${t.key}`} className={`btn${active === t.key ? " btn-primary" : ""}`} style={{ padding: "6px 14px", fontSize: 12 }}>
              <Icon size={14} /> {t.label}
            </a>
          );
        })}
        <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>
          {active === "certificates"
            ? `已过期 ${certStats.expired} · 30 天内到期 ${certStats.soon} · 共 ${certStats.total} 张`
            : active === "dorms"
              ? `在住 ${dorms.filter((d) => !d.checkOut).length} 人`
              : `在岗 ${agency.filter((a) => a.status === "在岗").length} 人`}
        </span>
      </div>

      {active === "certificates" ? (
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <IdCard /> 证照与健康证
            </h2>
            <span className="card-sub">到期前 30 天标黄，过期标红</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>员工</th>
                  <th>部门</th>
                  <th>证照</th>
                  <th>证号</th>
                  <th>到期日期</th>
                  <th>剩余</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-main">{c.employee}</td>
                    <td className="cell-sub">{c.department}</td>
                    <td>{c.type}</td>
                    <td className="num cell-sub">{c.number || "—"}</td>
                    <td className="num">{c.expiresAt}</td>
                    <td>
                      <Badge tone={c.daysLeft < 0 ? "red" : c.daysLeft <= 30 ? "amber" : "green"}>
                        {c.daysLeft < 0 ? `已过期 ${Math.abs(c.daysLeft)} 天` : `剩 ${c.daysLeft} 天`}
                      </Badge>
                    </td>
                    <td>
                      <RenewButton id={c.id} />
                    </td>
                  </tr>
                ))}
                {certificates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty">
                      还没有证照记录
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {active === "dorms" ? (
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <BedDouble /> 员工宿舍
            </h2>
            <span className="card-sub">{dorms.length} 条记录</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>员工</th>
                  <th>部门</th>
                  <th>楼栋</th>
                  <th>房间</th>
                  <th>床位</th>
                  <th>月费</th>
                  <th>入住</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {dorms.map((d) => (
                  <tr key={d.id}>
                    <td className="cell-main">{d.employee}</td>
                    <td className="cell-sub">{d.department}</td>
                    <td>{d.building}</td>
                    <td className="num">{d.roomNo}</td>
                    <td className="cell-sub">{d.bedNo || "—"}</td>
                    <td className="num">{d.fee ?? "—"}</td>
                    <td className="num cell-sub">{d.checkIn || "—"}</td>
                    <td>
                      <Badge tone={d.checkOut ? "gray" : "green"}>{d.checkOut ? "已退宿" : "在住"}</Badge>
                    </td>
                    <td>{d.checkOut ? <span className="cell-sub">—</span> : <CheckoutButton id={d.id} />}</td>
                  </tr>
                ))}
                {dorms.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty">
                      还没有宿舍记录
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {active === "agency" ? (
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <UserRoundCheck /> 临时工与外包台账
            </h2>
            <span className="card-sub">按劳务公司登记，记录日薪与在场周期</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>劳务公司</th>
                  <th>岗位</th>
                  <th>日薪</th>
                  <th>进场</th>
                  <th>离场</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {agency.map((w) => (
                  <tr key={w.id}>
                    <td className="cell-main">{w.name}</td>
                    <td>{w.agency}</td>
                    <td className="cell-sub">{w.role || "—"}</td>
                    <td className="num">{w.dailyRate ?? "—"}</td>
                    <td className="num cell-sub">{w.startDate || "—"}</td>
                    <td className="num cell-sub">{w.endDate || "—"}</td>
                    <td>
                      <Badge tone={w.status === "在岗" ? "green" : "gray"}>{w.status}</Badge>
                    </td>
                    <td>
                      <AgencyStatusButton id={w.id} status={w.status} />
                    </td>
                  </tr>
                ))}
                {agency.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty">
                      还没有临时工记录
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
