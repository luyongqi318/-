"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function NewJobDialog({ departments }: { departments: { id: number; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    department_id: String(departments[0]?.id ?? ""),
    headcount: "1",
    salary_min: "6000",
    salary_max: "8000",
    priority: "中",
    description: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("请填写职位名称");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/recruitment/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          department_id: Number(form.department_id),
          headcount: Number(form.headcount),
          salary_min: Number(form.salary_min),
          salary_max: Number(form.salary_max),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "创建失败");
      setOpen(false);
      setForm((f) => ({ ...f, title: "", description: "" }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={15} /> 发布职位
      </button>
      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>发布新职位</h3>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="关闭">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                {error ? <div className="form-error">{error}</div> : null}
                <div className="form-grid">
                  <div className="field full">
                    <label>职位名称</label>
                    <input
                      className="input"
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="如：前台接待"
                    />
                  </div>
                  <div className="field">
                    <label>所属部门</label>
                    <select className="select" value={form.department_id} onChange={(e) => set("department_id", e.target.value)}>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>招聘人数</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={form.headcount}
                      onChange={(e) => set("headcount", e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>薪资下限（元/月）</label>
                    <input className="input" type="number" value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>薪资上限（元/月）</label>
                    <input className="input" type="number" value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>优先级</label>
                    <select className="select" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                      <option>高</option>
                      <option>中</option>
                      <option>低</option>
                    </select>
                  </div>
                  <div className="field full">
                    <label>职位描述（可选）</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="岗位职责与任职要求，可留空由 HR 补充"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn" onClick={() => setOpen(false)}>
                  取消
                </button>
                <button className="btn btn-primary" disabled={loading}>
                  {loading ? "发布中…" : "确认发布"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
