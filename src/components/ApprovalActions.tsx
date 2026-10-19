"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";

export function ApprovalActions({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"已通过" | "已驳回" | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (status !== "待审批") {
    return <span className="cell-sub">—</span>;
  }

  async function submit() {
    if (!decision) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "处理失败");
      setDecision(null);
      setComment("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "处理失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex" style={{ gap: 6 }}>
        <button className="btn" style={{ padding: "4px 10px", fontSize: 11.5 }} onClick={() => setDecision("已通过")}>
          <Check size={13} /> 通过
        </button>
        <button className="btn" style={{ padding: "4px 10px", fontSize: 11.5 }} onClick={() => setDecision("已驳回")}>
          <X size={13} /> 驳回
        </button>
      </div>
      {decision
        ? createPortal(
            <div className="modal-backdrop" onClick={() => setDecision(null)}>
              <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                  <h3>{decision === "已通过" ? "通过审批" : "驳回审批"}</h3>
                  <button className="icon-btn" onClick={() => setDecision(null)} aria-label="关闭">
                    <X size={16} />
                  </button>
                </div>
                <div className="modal-body">
                  {error ? <div className="form-error">{error}</div> : null}
                  <div className="field">
                    <label>审批意见（可选）</label>
                    <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
                  </div>
                </div>
                <div className="modal-foot">
                  <button className="btn" onClick={() => setDecision(null)}>
                    取消
                  </button>
                  <button className="btn btn-primary" onClick={() => void submit()} disabled={loading}>
                    {loading ? "处理中…" : "确认"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
