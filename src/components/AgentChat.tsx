"use client";

import { FileCode2, FileSpreadsheet, FileText, Loader2, Paperclip, Presentation, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChartBlock } from "./ChartBlock";

type Msg = {
  role: "user" | "assistant";
  content: string;
  tools?: { tool: string; ok: boolean }[];
  attachments?: { type: "image"; dataUrl: string }[];
};

/** 轻量 Markdown：只处理标题、列表与 **加粗**，避免引入额外依赖。 */
function renderInline(text: string, key: number) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={`${key}-${i}`} href={link[2]} style={{ color: "#0071e3", textDecoration: "underline" }}>
          {link[1]}
        </a>
      );
    }
    return part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${key}-${i}`}>{part}</span>
    );
  });
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(!configured);
  const [model, setModel] = useState(configured ? "DeepSeek" : "本地演示模式");
  const [exporting, setExporting] = useState("");
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  /** 选中文件先暂存，等用户补充提示词后一起发送 */
  function stageFile(file: File) {
    setPending({ file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "" });
  }

  /** 表格 → 覆盖导入；文本 → 知识库。返回给模型看的说明。 */
  async function ingestFile(file: File): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (["txt", "md"].includes(ext)) {
      const text = await file.text();
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: file.name.replace(/\.[^.]+$/, ""), content: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "存入知识库失败");
      return `[已把文件《${file.name}》存入知识库，共 ${text.length} 字]`;
    }

    if (!["xlsx", "xls", "csv"].includes(ext)) {
      throw new Error("支持 Excel / CSV / TXT / Markdown / 图片；Word、PDF 请先另存");
    }

    const form = new FormData();
    form.append("entity", "auto");
    form.append("mode", "replace");
    form.append("file", file);
    const res = await fetch("/api/import", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "导入失败");

    const parts = [
      `[已上传并导入文件《${file.name}》：识别为${data.label}，新增 ${data.inserted} 条，替换旧数据 ${data.replaced ?? 0} 条，错误 ${data.errors?.length ?? 0} 条]`,
    ];
    if (data.errors?.length) {
      parts.push(`其中有问题的行：${data.errors.slice(0, 5).map((e: any) => `第 ${e.line} 行 ${e.message}`).join("；")}`);
    }
    return parts.join("\n");
  }

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  }

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if ((!question && !pending) || loading) return;

    let content = question;
    let attachments: { type: "image"; dataUrl: string }[] | undefined;
    if (pending) {
      setUploading(true);
      try {
        if (pending.file.type.startsWith("image/")) {
          attachments = [{ type: "image", dataUrl: await readAsDataUrl(pending.file) }];
          if (!content) content = "请描述这张图片，并结合酒店 HR 场景给出可以落地的建议";
        } else {
          const note = await ingestFile(pending.file);
          content = `${note}\n\n${question}`;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "上传失败");
        setUploading(false);
        return;
      }
      setUploading(false);
      setPending(null);
    }
    if (!content) content = "请描述这张图片";

    setInput("");
    setError("");
    const next: Msg[] = [...messages, { role: "user", content, attachments }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-200).map((m) => ({ role: m.role, content: m.content, attachments: m.attachments })),
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
      if (data.model) setModel(data.model === "deepseek-flash" ? "DeepSeek-V4.1-Flash · Max" : data.model);
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
                {m.attachments?.length ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: m.content ? 8 : 0 }}>
                    {m.attachments.map((a, k) => (
                      <img key={k} src={a.dataUrl} alt="附件图片" style={{ maxWidth: 220, borderRadius: 10, display: "block" }} />
                    ))}
                  </div>
                ) : null}
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
        {pending ? (
          <div className="attach-chip">
            {pending.preview ? <img src={pending.preview} alt="预览" /> : <span className="attach-doc">📄</span>}
            <span className="attach-name">{pending.file.name}</span>
            <span className="attach-hint">补充一句要我怎么处理，然后发送</span>
            <button className="attach-remove" onClick={() => setPending(null)} aria-label="移除附件">
              ×
            </button>
          </div>
        ) : null}
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
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.webp,.gif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) stageFile(file);
              e.target.value = "";
            }}
          />
          <button className="attach-btn" onClick={() => fileRef.current?.click()} disabled={loading} aria-label="上传文件更新数据库">
            {uploading ? <Loader2 size={17} className="spin" /> : <Paperclip size={17} />}
          </button>
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
