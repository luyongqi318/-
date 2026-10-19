"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AssignTrainingDialog({
  employees,
  courses,
}: {
  employees: { id: number; name: string; department: string }[];
  courses: { id: number; title: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [employeeId, setEmployeeId] = useState(String(employees[0]?.id ?? ""));
  const [courseId, setCourseId] = useState(String(courses[0]?.id ?? ""));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d.toISOString().slice(0, 10);
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/training/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: Number(employeeId),
          course_id: Number(courseId),
          due_date: dueDate,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "分配失败");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "分配失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={15} /> 分配培训
      </button>
      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>分配培训任务</h3>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="关闭">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                {error ? <div className="form-error">{error}</div> : null}
                <div className="field">
                  <label>员工</label>
                  <select className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} · {emp.department}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>课程</label>
                  <select className="select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>截止日期</label>
                  <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn" onClick={() => setOpen(false)}>
                  取消
                </button>
                <button className="btn btn-primary" disabled={loading}>
                  {loading ? "分配中…" : "确认分配"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
