"use client";

import { Mail, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const TEMPLATES: Record<string, { label: string; subject: string; body: string }> = {
  custom: { label: "空白邮件", subject: "", body: "" },
  interview: {
    label: "面试邀约",
    subject: "面试邀约 · 东锦江希尔顿逸林酒店",
    body:
      "您好：\n\n感谢您应聘东锦江希尔顿逸林酒店。想邀请您参加面试：\n\n时间：（待确认）\n地点：上海市浦东新区浦东南路 2887 号 人力资源部\n\n请携带身份证件，提前 10 分钟到达。如时间不便，请直接回复调整。\n\n人力资源部",
  },
  training: {
    label: "培训提醒",
    subject: "培训提醒 · 东锦江希尔顿逸林酒店",
    body: "您好：\n\n您有一项培训任务待完成：\n\n课程：（待确认）\n截止日期：（待确认）\n\n请在截止日期前完成学习与考核。\n\n人力资源部",
  },
  onboarding: {
    label: "入职提醒",
    subject: "入职提醒 · 东锦江希尔顿逸林酒店",
    body: "您好：\n\n欢迎加入东锦江希尔顿逸林酒店！\n\n报到时间：（待确认）\n报到地点：酒店员工通道 人力资源部\n\n请携带身份证、健康证与离职证明。\n\n人力资源部",
  },
  approval: {
    label: "审批结果",
    subject: "审批结果通知 · 东锦江希尔顿逸林酒店",
    body: "您好：\n\n您提交的申请已有结果：\n\n（请在下方补充结果）\n\n人力资源部",
  },
};

export function ComposeDialog({ employees }: { employees: { id: number; name: string; email: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState("custom");
  const [to, setTo] = useState(employees[0]?.email || "");
  const [toName, setToName] = useState(employees[0]?.name || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function pickTemplate(key: string) {
    setTemplate(key);
    const tpl = TEMPLATES[key];
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  }

  function pickEmployee(id: string) {
    const emp = employees.find((x) => String(x.id) === id);
    if (emp) {
      setTo(emp.email);
      setToName(emp.name);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, toName, subject, body, template }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发送失败");
      setMessage(data.mode === "smtp" && data.ok ? "邮件已发送" : "已存入发件箱（未配置 SMTP 或发送失败）");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Mail size={15} /> 写邮件
      </button>
      {message ? <span className="badge badge-green" style={{ marginLeft: 8 }}>{message}</span> : null}
      {open
        ? createPortal(
            <div className="modal-backdrop" onClick={() => setOpen(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                  <h3>写邮件</h3>
                  <button className="icon-btn" onClick={() => setOpen(false)} aria-label="关闭">
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={submit}>
                  <div className="modal-body">
                    {error ? <div className="form-error">{error}</div> : null}
                    <div className="form-grid">
                      <div className="field">
                        <label>模板</label>
                        <select className="select" value={template} onChange={(e) => pickTemplate(e.target.value)}>
                          {Object.entries(TEMPLATES).map(([key, tpl]) => (
                            <option key={key} value={key}>
                              {tpl.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>选择员工（自动填邮箱）</label>
                        <select className="select" onChange={(e) => pickEmployee(e.target.value)} defaultValue="">
                          <option value="">—</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field full">
                        <label>收件邮箱</label>
                        <input className="input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" />
                      </div>
                      <div className="field full">
                        <label>主题</label>
                        <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
                      </div>
                      <div className="field full">
                        <label>正文</label>
                        <textarea className="input" rows={9} value={body} onChange={(e) => setBody(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="modal-foot">
                    <button type="button" className="btn" onClick={() => setOpen(false)}>
                      取消
                    </button>
                    <button className="btn btn-primary" disabled={loading}>
                      {loading ? "发送中…" : "发送"}
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
