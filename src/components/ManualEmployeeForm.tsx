"use client";

import { Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ManualEmployeeForm({ departments }: { departments: { id: number; name: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    gender: "女",
    phone: "",
    email: "",
    department_id: String(departments[0]?.id ?? ""),
    position: "",
    level: "员工",
    hire_date: new Date().toISOString().slice(0, 10),
    status: "试用期",
    salary: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!form.name.trim() || !form.position.trim()) {
      setError("姓名和职位必填");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, department_id: Number(form.department_id), salary: Number(form.salary) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setMessage(`已录入 ${form.name}（工号 ${data.emp_no}）`);
      setForm((prev) => ({ ...prev, name: "", phone: "", email: "", position: "", salary: "" }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card card-pad">
      <h2 className="card-title" style={{ marginBottom: 4 }}>
        <UserPlus /> 手工录入员工
      </h2>
      <p className="muted" style={{ fontSize: 11.5, marginTop: 0, marginBottom: 16 }}>
        适合零散补录；批量请用「批量导入」。
      </p>
      {message ? (
        <div className="form-error" style={{ background: "#eaf3ee", color: "#2c6a58", borderColor: "#cfe3da" }}>
          {message}
        </div>
      ) : null}
      {error ? <div className="form-error">{error}</div> : null}
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label>姓名</label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="张示例" />
          </div>
          <div className="field">
            <label>性别</label>
            <select className="select" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option>女</option>
              <option>男</option>
            </select>
          </div>
          <div className="field">
            <label>部门</label>
            <select className="select" value={form.department_id} onChange={(e) => set("department_id", e.target.value)}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>职位</label>
            <input className="input" value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="前台接待" />
          </div>
          <div className="field">
            <label>级别</label>
            <select className="select" value={form.level} onChange={(e) => set("level", e.target.value)}>
              <option>员工</option>
              <option>主管</option>
              <option>经理</option>
              <option>总监</option>
            </select>
          </div>
          <div className="field">
            <label>状态</label>
            <select className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option>试用期</option>
              <option>在职</option>
              <option>离职</option>
            </select>
          </div>
          <div className="field">
            <label>入职日期</label>
            <input className="input" type="date" value={form.hire_date} onChange={(e) => set("hire_date", e.target.value)} />
          </div>
          <div className="field">
            <label>月薪（元）</label>
            <input className="input" type="number" value={form.salary} onChange={(e) => set("salary", e.target.value)} placeholder="6500" />
          </div>
          <div className="field">
            <label>手机号</label>
            <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="13800000000" />
          </div>
          <div className="field">
            <label>邮箱</label>
            <input className="input" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@doubletree-pudong.com" />
          </div>
        </div>
        <button className="btn btn-primary" disabled={loading}>
          {loading ? <Loader2 size={15} className="spin" /> : null}
          {loading ? "保存中…" : "保存员工"}
        </button>
      </form>
    </section>
  );
}
