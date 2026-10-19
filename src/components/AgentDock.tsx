"use client";

import { Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AgentChat } from "./AgentChat";

export function AgentDock() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/agent") return null;

  return (
    <>
      <button className="agent-fab" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Sparkles size={16} />
        问 AI 助手
      </button>
      {open ? (
        <div className="agent-panel" role="dialog" aria-label="HR 智能体">
          <div className="agent-head">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "rgba(255,255,255,.12)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Sparkles size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="agent-title">HR 智能体</div>
              <div className="agent-sub">已接入招聘、培训、排班与绩效数据</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="关闭"
              style={{
                background: "rgba(255,255,255,.1)",
                border: "none",
                color: "#fff",
                width: 28,
                height: 28,
                borderRadius: 8,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>
          <AgentChat variant="dock" />
        </div>
      ) : null}
    </>
  );
}
