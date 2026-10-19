"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function post(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "操作失败");
  return data;
}

export function AddCertificateForm({ employees }: { employees: { id: number; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(String(employees[0]?.id ?? ""));
  const [type, setType] = useState("健康证");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/admin/certificates", { employeeId: Number(employeeId), type, expiresAt });
      setOpen(false);
      setExpiresAt("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        新增证照
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card card-pad" style={{ marginBottom: 14 }}>
      {error ? <div className="form-error">{error}</div> : null}
      <div className="form-grid">
        <div className="field">
          <label>员工</label>
          <select className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>证照类型</label>
          <input className="input" value={type} onChange={(e) => setType(e.target.value)} />
        </div>
        <div className="field">
          <label>到期日期</label>
          <input className="input" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
      </div>
      <div className="flex" style={{ gap: 8 }}>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "保存中…" : "保存"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          取消
        </button>
      </div>
    </form>
  );
}

export function RenewButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn"
      style={{ padding: "4px 10px", fontSize: 11.5 }}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await post("/api/admin/certificates", { id }, "PATCH");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "处理中…" : "续期 1 年"}
    </button>
  );
}

export function AddDormForm({ employees }: { employees: { id: number; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: String(employees[0]?.id ?? ""), building: "A 栋", roomNo: "", bedNo: "", fee: "300", checkIn: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/admin/dorms", { ...form, employeeId: Number(form.employeeId), fee: Number(form.fee) });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        分配宿舍
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card card-pad" style={{ marginBottom: 14 }}>
      {error ? <div className="form-error">{error}</div> : null}
      <div className="form-grid">
        <div className="field">
          <label>员工</label>
          <select className="select" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>楼栋</label>
          <input className="input" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
        </div>
        <div className="field">
          <label>房间号</label>
          <input className="input" value={form.roomNo} onChange={(e) => setForm({ ...form, roomNo: e.target.value })} placeholder="201" />
        </div>
        <div className="field">
          <label>床位</label>
          <input className="input" value={form.bedNo} onChange={(e) => setForm({ ...form, bedNo: e.target.value })} placeholder="1 号床" />
        </div>
        <div className="field">
          <label>月费（元）</label>
          <input className="input" type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
        </div>
        <div className="field">
          <label>入住日期</label>
          <input className="input" type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
        </div>
      </div>
      <div className="flex" style={{ gap: 8 }}>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "保存中…" : "保存"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          取消
        </button>
      </div>
    </form>
  );
}

export function CheckoutButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn"
      style={{ padding: "4px 10px", fontSize: 11.5 }}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await post("/api/admin/dorms", { id }, "PATCH");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "处理中…" : "办理退宿"}
    </button>
  );
}

export function AddAgencyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", agency: "", role: "", dailyRate: "250", startDate: "", endDate: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/admin/agency", { ...form, dailyRate: Number(form.dailyRate) });
      setOpen(false);
      setForm({ name: "", agency: "", role: "", dailyRate: "250", startDate: "", endDate: "", phone: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        登记临时工
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card card-pad" style={{ marginBottom: 14 }}>
      {error ? <div className="form-error">{error}</div> : null}
      <div className="form-grid">
        <div className="field">
          <label>姓名</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>劳务公司</label>
          <input className="input" value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} />
        </div>
        <div className="field">
          <label>岗位</label>
          <input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
        <div className="field">
          <label>日薪（元）</label>
          <input className="input" type="number" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} />
        </div>
        <div className="field">
          <label>进场日期</label>
          <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div className="field">
          <label>离场日期</label>
          <input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
      </div>
      <div className="flex" style={{ gap: 8 }}>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "保存中…" : "保存"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          取消
        </button>
      </div>
    </form>
  );
}

export function AgencyStatusButton({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = status === "在岗" ? "已离场" : "在岗";
  return (
    <button
      className="btn"
      style={{ padding: "4px 10px", fontSize: 11.5 }}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await post("/api/admin/agency", { id, status: next }, "PATCH");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "处理中…" : next === "已离场" ? "标记离场" : "恢复在岗"}
    </button>
  );
}
