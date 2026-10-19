"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";

export function PasswordForm({ custom }: { custom: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (next !== confirm) {
      setError("两次输入的新密码不一致");
      return;
    }
    if (next.length < 8) {
      setError("新密码至少 8 位");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "修改失败");
      setMessage("密码已更新，下次登录请使用新密码");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "修改失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card card-pad">
      <div className="flex" style={{ justifyContent: "space-between", marginBottom: 4 }}>
        <h2 className="card-title">
          <KeyRound /> 登录密码
        </h2>
        <span className={`badge ${custom ? "badge-green" : "badge-amber"} badge-dot`}>
          {custom ? "已自定义" : "使用默认密码"}
        </span>
      </div>
      <p className="muted" style={{ fontSize: 11.5, marginTop: 0, marginBottom: 16 }}>
        {custom
          ? "密码以 scrypt 哈希保存在本地数据库，修改后立即生效。"
          : "当前仍是演示默认密码，公网使用前请务必修改。"}
      </p>

      {message ? (
        <div className="form-error" style={{ background: "#eaf3ee", color: "#2c6a58", borderColor: "#cfe3da" }}>
          {message}
        </div>
      ) : null}
      {error ? <div className="form-error">{error}</div> : null}

      <form onSubmit={submit}>
        <div className="field">
          <label>当前密码</label>
          <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </div>
        <div className="form-grid">
          <div className="field">
            <label>新密码</label>
            <input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="至少 8 位" />
          </div>
          <div className="field">
            <label>确认新密码</label>
            <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <button className="btn btn-primary" disabled={loading}>
          {loading ? <Loader2 size={15} className="spin" /> : null}
          {loading ? "保存中…" : "更新密码"}
        </button>
      </form>
    </section>
  );
}
