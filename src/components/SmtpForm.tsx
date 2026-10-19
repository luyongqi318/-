"use client";

import { CheckCircle2, Loader2, MailCheck, XCircle } from "lucide-react";
import { useState } from "react";

export function SmtpForm({
  initial,
}: {
  initial: { host: string; port: string; user: string; from: string; secure: boolean; configured: boolean };
}) {
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(initial.port);
  const [user, setUser] = useState(initial.user);
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState(initial.from);
  const [secure, setSecure] = useState(initial.secure);
  const [configured, setConfigured] = useState(initial.configured);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/settings/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, user, pass, from, secure }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setConfigured(Boolean(data.configured));
      setPass("");
      setMessage("SMTP 配置已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/mail/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      setTestResult({ ok: Boolean(data.ok), text: data.ok ? "SMTP 连接正常" : data.error || "连接失败" });
    } catch (err) {
      setTestResult({ ok: false, text: err instanceof Error ? err.message : "连接失败" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="card card-pad">
      <div className="flex" style={{ justifyContent: "space-between", marginBottom: 4 }}>
        <h2 className="card-title">
          <MailCheck /> 邮件通道
        </h2>
        <span className={`badge ${configured ? "badge-green" : "badge-amber"} badge-dot`}>
          {configured ? "SMTP 已配置" : "未配置（进发件箱）"}
        </span>
      </div>
      <p className="muted" style={{ fontSize: 11.5, marginTop: 0, marginBottom: 16 }}>
        配置后审批通知、面试邀约、培训提醒会真实发出；未配置时全部进「邮件中心」发件箱，流程照样能跑。
      </p>

      {message ? <div className="form-error" style={{ background: "#eaf3ee", color: "#2c6a58", borderColor: "#cfe3da" }}>{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      <div className="form-grid">
        <div className="field">
          <label>SMTP 主机</label>
          <input className="input" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.exmail.qq.com" />
        </div>
        <div className="field">
          <label>端口</label>
          <input className="input" value={port} onChange={(e) => setPort(e.target.value)} placeholder="465" />
        </div>
        <div className="field">
          <label>账号</label>
          <input className="input" value={user} onChange={(e) => setUser(e.target.value)} placeholder="hr@your-hotel.com" />
        </div>
        <div className="field">
          <label>密码 / 授权码</label>
          <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={configured ? "已保存，留空则不修改" : "SMTP 授权码"} />
        </div>
        <div className="field">
          <label>发件人</label>
          <input className="input" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="HR <hr@your-hotel.com>" />
        </div>
        <div className="field">
          <label>加密</label>
          <select className="select" value={secure ? "1" : "0"} onChange={(e) => setSecure(e.target.value === "1")}>
            <option value="1">SSL/TLS（465）</option>
            <option value="0">STARTTLS（587）</option>
          </select>
        </div>
      </div>

      <div className="flex" style={{ gap: 9, marginTop: 4 }}>
        <button className="btn btn-primary" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 size={15} className="spin" /> : null}
          {saving ? "保存中…" : "保存 SMTP"}
        </button>
        <button className="btn" onClick={() => void test()} disabled={testing || !configured}>
          {testing ? <Loader2 size={15} className="spin" /> : null}
          {testing ? "测试中…" : "测试连接"}
        </button>
      </div>

      {testResult ? (
        <div className="flex" style={{ marginTop: 12, fontSize: 12 }}>
          {testResult.ok ? <CheckCircle2 size={15} color="#2c6a58" /> : <XCircle size={15} color="#9e3b3b" />}
          <span className="muted">{testResult.text}</span>
        </div>
      ) : null}
    </section>
  );
}
