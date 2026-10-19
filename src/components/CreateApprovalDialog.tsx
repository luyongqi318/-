"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const TYPES = ["请假", "加班", "调班", "转正", "离职", "培训申请"];

export function CreateApprovalDialog({ employees }: { employees: { id: number; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type: "请假",
    employeeId: String(employees[0]?.id ?? ""),
    title: "",
    detail: "",
    startDate: "",
    endDate: "",
    amount: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || form.detail.trim().length < 4) {
      setError("请填写标题与事由（至少 4 个字）");
      return;
    }
    setLoading(true);
    try {
      const employee = employees.find((x) => String(x.id) === form.employeeId);
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          requester: employee?.name ?? "hr",
          employeeId: Number(form.employeeId) || null,
          title: form.title,
          detail: form.detail,
          startDate: form.startDate,
          endDate: form.endDate,
          amount: form.amount === "" ? null : Number(form.amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      setOpen(false);
      setForm((prev) => ({ ...prev, title: "", detail: "", amount: "" }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={15} /> 发起审批
      </button>
      {open
        ? createPortal(
            <div className="modal-backdrop" onClick={() => setOpen(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                  <h3>发起审批</h3>
                  <button className="icon-btn" onClick={() => setOpen(false)} aria-label="关闭">
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={submit}>
                  <div className="modal-body">
                    {error ? <div className="form-error">{error}</div> : null}
                    <div className="form-grid">
                      <div className="field">
                        <label>类型</label>
                        <select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>
                          {TYPES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>申请人</label>
                        <select className="select" value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)}>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field full">
                        <label>标题</label>
                        <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="如：10 月 12 日 事假 1 天" />
                      </div>
                      <div className="field">
                        <label>开始日期</label>
                        <input className="input" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                      </div>
                      <div className="field">
                        <label>结束日期</label>
                        <input className="input" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
                      </div>
                      <div className="field">
                        <label>数量（天 / 小时 / 元）</label>
                        <input className="input" type="number" step="0.5" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
                      </div>
                      <div className="field full">
                        <label>事由</label>
                        <textarea className="input" rows={4} value={form.detail} onChange={(e) => set("detail", e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="modal-foot">
                    <button type="button" className="btn" onClick={() => setOpen(false)}>
                      取消
                    </button>
                    <button className="btn btn-primary" disabled={loading}>
                      {loading ? "提交中…" : "提交审批"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
