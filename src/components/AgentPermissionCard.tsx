"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function AgentPermissionCard({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle(next: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writeEnabled: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setEnabled(next);
      setMessage(next ? "已开启：智能体现在可以直接改数据库" : "已关闭：智能体恢复只读");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-pad">
      <h2 className="card-title" style={{ marginBottom: 6 }}>
        <ShieldCheck /> 智能体权限
      </h2>
      <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.9, marginTop: 0 }}>
        开启后，智能体可以按你的指令直接修改员工资料（部门、职位、电话、状态等），每次修改都会写入审计日志。
        关闭后它只能查询，不能改数据。
      </p>
      <label className="flex" style={{ gap: 10, alignItems: "center", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(e) => void toggle(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        <span style={{ fontSize: 13 }}>{enabled ? "已开启最高权限（可写）" : "只读（不可写）"}</span>
        {busy ? <Loader2 size={14} className="spin" /> : null}
      </label>
      {message ? <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>{message}</div> : null}
    </section>
  );
}
