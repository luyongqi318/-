"use client";

import { FileCode2, FileSpreadsheet, FileText, Loader2, Presentation, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChartBlock } from "./ChartBlock";

type Msg = {
  role: "user" | "assistant";
  content: string;
  tools?: { tool: string; ok: boolean }[];
};

/** 轻量 Markdown：只处理标题、列表与 **加粗**，避免引入额外依赖。 */
function renderInline(text: string, key: number) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong> : <span key={`${key}-${i}`}>{part}</span>,
  );
}

function renderLines(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="md-gap" />;
    if (/^#{1,4}\s/.test(trimmed)) {
      return (
        <div key={i} className="md-h">
          {renderInline(trimmed.replace(/^#{1,4}\s/, ""), i)}
        </div>
      );
    }
    if (/^[-*]\s/.test(trimmed)) {
      return (
        <div key={i} className="md-li">
          {renderInline(trimmed.replace(/^[-*]\s/, ""), i)}
        </div>
      );
    }
    return <div key={i}>{renderInline(line, i)}</div>;
  });
}

function MessageBody({ content }: { content: string }) {
  // 支持 ```chart {...}``` 代码块，直接渲染成可下载的图表
  const parts = content.split(/```chart\s*([\s\S]*?)```/g);
  return (
    <div className="md">
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          try {
            const spec = JSON.parse(part.trim());
            return <ChartBlock key={index} spec={spec} />;
          } catch {
            return (
              <pre key={index} className="md-code">
                {part.trim()}
              </pre>
            );
          }
        }
        return (
          <div key={index} className="md-part">
            {renderLines(part)}
          </div>
        );
      })}
    </div>
  );
}

const DEFAULT_SUGGESTIONS = [
  "本周招聘进展如何？哪些岗位缺口最大？",
  "哪些员工培训逾期了？",
  "帮我写一份前台接待的招聘 JD",
  "本月排班和考勤有什么风险？",
];

export function AgentChat({
  variant = "dock",
  suggestions = DEFAULT_SUGGESTIONS,
  configured = false,
  initialMessages = [],
}: {
  variant?: "dock" | "page";
  suggestions?: string[];
  configured?: boolean;
  initialMessages?: { role: "user" | "assistant"; content: string }[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages.map((m) => ({ role: m.role, content: m.content })));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(!configured);
  const [model, setModel] = useState(configured ? "DeepSeek" : "本地演示模式");
  const [exporting, setExporting] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setError("");
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        tools?: { tool: string; ok: boolean }[];
        demo?: boolean;
        model?: string;
        error?: string;
      };
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "智能体暂时不可用");
      }
      setDemo(!!data.demo);
      if (data.model) setModel(data.model);
      setMessages([...next, { role: "assistant", content: data.reply, tools: data.tools }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  }

  async function exportAs(message: Msg, index: number, format: string) {
    if (exporting) return;
    setExporting(`${index}-${format}`);
    setError("");
    try {
      const firstLine = message.content.split("\n").find((line) => line.trim()) ?? "智能体导出";
      const title = firstLine.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/[【】]/g, "").trim().slice(0, 28) || "智能体导出";
      const res = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, title, content: message.content }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "生成文件失败");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成文件失败");
    } finally {
      setExporting("");
    }
  }

  return (
    <>
      <div className={variant === "page" ? "agent-page-body" : "agent-body"} ref={bodyRef}>
        {messages.length === 0 ? (
          <div className="agent-empty">
            <div style={{ display: "inline-flex", padding: 14, borderRadius: 16, background: "#f7ead0", color: "#8a6415" }}>
              <Sparkles size={24} />
            </div>
            <h3>今天想先处理哪件事？</h3>
            <p style={{ fontSize: 13 }}>
              我可以直接读取招聘、培训、员工、排班与绩效数据，回答问题、写 JD、生成面试提纲或培训计划。
            </p>
            <div className="suggestions" style={{ justifyContent: "center", marginTop: 14 }}>
              {suggestions.map((s) => (
                <button key={s} className="suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div className={`msg ${m.role === "user" ? "user" : "bot"}`} key={i}>
            <div className="msg-avatar">{m.role === "user" ? "我" : "AI"}</div>
            <div>
              <div className="msg-bubble">
                <MessageBody content={m.content} />
              </div>
              {m.tools && m.tools.length > 0 ? (
                <div className="msg-tools">
                  {m.tools.map((t, j) => (
                    <span className="tool-pill" key={j}>
                      {t.tool} {t.ok ? "✓" : "×"}
                    </span>
                  ))}
                </div>
              ) : null}
              {m.role === "assistant" ? (
                <div className="msg-actions">
                  <button className="msg-action" disabled={!!exporting} onClick={() => void exportAs(m, i, "docx")}>
                    {exporting === `${i}-docx` ? <Loader2 size={12} className="spin" /> : <FileText size={12} />} Word
                  </button>
                  <button className="msg-action" disabled={!!exporting} onClick={() => void exportAs(m, i, "xlsx")}>
                    {exporting === `${i}-xlsx` ? <Loader2 size={12} className="spin" /> : <FileSpreadsheet size={12} />} Excel
                  </button>
                  <button className="msg-action" disabled={!!exporting} onClick={() => void exportAs(m, i, "pptx")}>
                    {exporting === `${i}-pptx` ? <Loader2 size={12} className="spin" /> : <Presentation size={12} />} PPT
                  </button>
                  <button className="msg-action" disabled={!!exporting} onClick={() => void exportAs(m, i, "md")}>
                    {exporting === `${i}-md` ? <Loader2 size={12} className="spin" /> : <FileCode2 size={12} />} Markdown
                  </button>
                  <button className="msg-action" disabled={!!exporting} onClick={() => void exportAs(m, i, "txt")}>
                    {exporting === `${i}-txt` ? <Loader2 size={12} className="spin" /> : <FileText size={12} />} 文本
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {loading ? (
          <div className="msg bot">
            <div className="msg-avatar">AI</div>
            <div className="msg-bubble">
              <span className="typing">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="agent-foot">
        {error ? <div className="form-error">{error}</div> : null}
        <div className="agent-input-row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="问问招聘、培训、排班或绩效…（Enter 发送，Shift+Enter 换行）"
            rows={1}
          />
          <button className="send-btn" onClick={() => void send()} disabled={loading || !input.trim()} aria-label="发送">
            <Send size={17} />
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 6, display: "flex", justifyContent: "space-between" }}>
          <span>{demo ? "演示模式：未配置模型 Key，回答由本地数据生成" : `模型：${model}`}</span>
          <span>数据仅来自本系统</span>
        </div>
      </div>
    </>
  );
}
