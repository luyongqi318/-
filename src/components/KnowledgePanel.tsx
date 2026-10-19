"use client";

import { BookOpen, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Item = { id: number; title: string; created_at: string; size: number };

export function KnowledgePanel({ items }: { items: Item[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!title.trim() || content.trim().length < 10) {
      setError("请填写标题，内容至少 10 个字");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setMessage(`已投喂《${title}》，智能体会优先参考这条资料`);
      setTitle("");
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="two-col-wide">
      <section className="card card-pad">
        <h2 className="card-title" style={{ marginBottom: 4 }}>
          <BookOpen /> 投喂制度 / SOP 资料
        </h2>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 0, marginBottom: 16 }}>
          粘贴员工手册、服务标准、应急预案等文本，智能体回答时会优先引用；配置大模型后效果更完整。
        </p>
        {message ? (
          <div className="form-error" style={{ background: "#eaf3ee", color: "#2c6a58", borderColor: "#cfe3da" }}>
            {message}
          </div>
        ) : null}
        {error ? <div className="form-error">{error}</div> : null}
        <form onSubmit={save}>
          <div className="field">
            <label>资料标题</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：员工手册 2026 版 / 客房清洁 SOP" />
          </div>
          <div className="field">
            <label>资料内容</label>
            <textarea
              className="input"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="把制度或流程正文粘贴到这里，支持 2 万字以内……"
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 size={15} className="spin" /> : null}
            {loading ? "提交中…" : "投喂给智能体"}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">
            <BookOpen /> 已投喂资料
          </h2>
          <span className="card-sub">{items.length} 条</span>
        </div>
        <div className="todo-list" style={{ paddingTop: 8 }}>
          {items.length === 0 ? <div className="empty">还没有投喂资料</div> : null}
          {items.map((item) => (
            <div className="todo-item" key={item.id}>
              <span className="todo-icon" style={{ background: "#f4ecdc", color: "#856a3a" }}>
                <BookOpen size={14} />
              </span>
              <div className="todo-main">
                <b>{item.title}</b>
                <span>
                  {item.created_at} · {Math.round(item.size / 100) / 10} 千字
                </span>
              </div>
              <button className="icon-btn" onClick={() => void remove(item.id)} title="删除">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
