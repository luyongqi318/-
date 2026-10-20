"use client";

import { DatabaseZap, Loader2 } from "lucide-react";
import { useState } from "react";

export function ResetDataCard({ counts }: { counts: Record<string, number> }) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  async function run() {
    if (confirm.trim() !== "清空") {
      setError("请输入「清空」两个字确认");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "清空失败");
      setMessage(`已清空业务数据，备份保存在 ${data.backup}`);
      setConfirm("");
      location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "清空失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-pad">
      <h2 className="card-title" style={{ marginBottom: 6 }}>
        <DatabaseZap /> 清空业务数据
      </h2>
      <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.9, marginTop: 0 }}>
        演示数据可以一键清掉，换成酒店真实数据。当前共 <b>{total}</b> 条（员工 {counts.employees ?? 0} · 部门{" "}
        {counts.departments ?? 0} · 职位 {counts.jobs ?? 0} · 候选人 {counts.candidates ?? 0}）。清空前会自动备份到
        <code> data/backup-before-reset-*.db</code>，登录密码与模型/SMTP 配置保留。
      </p>
      {message ? <div className="form-error" style={{ background: "#eaf6ef", color: "#1d7a52", borderColor: "#c7e6d6" }}>{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      <div className="flex" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="输入「清空」以确认"
          style={{ width: 160 }}
        />
        <button className="btn" onClick={() => void run()} disabled={busy || total === 0} style={{ borderColor: "#b3261e", color: "#b3261e" }}>
          {busy ? <Loader2 size={15} className="spin" /> : null}
          {busy ? "清空中…" : total === 0 ? "暂无数据" : "清空并备份"}
        </button>
      </div>
    </section>
  );
}
