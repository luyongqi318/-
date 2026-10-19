"use client";

import { CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import { useState } from "react";

type State = {
  configured: boolean;
  masked: string;
  baseUrl: string;
  model: string;
  source: string;
};

export function AgentSettingsForm({ initial }: { initial: State }) {
  const [state, setState] = useState<State>(initial);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [model, setModel] = useState(initial.model);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(clearKey = false) {
    setSaving(true);
    setError("");
    setMessage("");
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: clearKey ? "" : apiKey, baseUrl, model, clearKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setState(data as State);
      setApiKey("");
      setMessage(clearKey ? "已清除 API Key，智能体回到演示模式" : "已保存，立即生效，无需重启");
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
      const res = await fetch("/api/settings/agent/test", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, text: `连接成功，模型 ${data.model} 返回：${data.reply || "ok"}` });
      } else {
        setTestResult({ ok: false, text: data.error || "连接失败" });
      }
    } catch (err) {
      setTestResult({ ok: false, text: err instanceof Error ? err.message : "连接失败" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <div className="card card-pad">
        <div className="flex" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <h2 className="card-title">模型接入</h2>
          <span className={`badge ${state.configured ? "badge-green" : "badge-amber"} badge-dot`}>
            {state.configured ? `已配置 ${state.masked}` : "演示模式（未配置）"}
          </span>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 0, marginBottom: 18 }}>
          {state.source === "db"
            ? "当前 Key 保存在本地数据库，可随时在下方替换或清除。"
            : state.source === "env"
              ? "当前 Key 来自环境变量；在下方保存会覆盖环境变量配置。"
              : "填入你自己的 DeepSeek（或任意 OpenAI 兼容网关）Key，保存后智能体立即可用。"}
        </p>

        {message ? <div className="form-error" style={{ background: "#eaf3ee", color: "#2c6a58", borderColor: "#cfe3da" }}>{message}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}

        <div className="field">
          <label>API Key</label>
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={state.configured ? `已保存 ${state.masked}，填写新值可替换` : "sk-..."}
            autoComplete="off"
          />
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Base URL</label>
            <input className="input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com" />
          </div>
          <div className="field">
            <label>模型</label>
            <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-chat" />
          </div>
        </div>

        <div className="flex" style={{ gap: 9, marginTop: 4, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => void save(false)} disabled={saving}>
            {saving ? <Loader2 size={15} className="spin" /> : null}
            {saving ? "保存中…" : "保存配置"}
          </button>
          <button className="btn" onClick={test} disabled={testing || !state.configured}>
            {testing ? <Loader2 size={15} className="spin" /> : null}
            {testing ? "测试中…" : "测试连接"}
          </button>
          {state.configured && state.source === "db" ? (
            <button className="btn" onClick={() => void save(true)} disabled={saving}>
              <Trash2 size={14} /> 清除 Key
            </button>
          ) : null}
        </div>

        {testResult ? (
          <div className="flex" style={{ marginTop: 14, fontSize: 12, alignItems: "flex-start" }}>
            {testResult.ok ? <CheckCircle2 size={15} color="#2c6a58" /> : <XCircle size={15} color="#9e3b3b" />}
            <span className="muted" style={{ lineHeight: 1.8 }}>
              {testResult.text}
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}
