"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

export function ClearChatButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/agent/chat", { method: "DELETE" });
          location.reload();
        } finally {
          setBusy(false);
        }
      }}
    >
      <Trash2 size={14} /> {busy ? "清空中…" : "清空对话"}
    </button>
  );
}
