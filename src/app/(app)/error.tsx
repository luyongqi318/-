"use client";

import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[hr-app] page error:", error);
  }, [error]);

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <div className="card card-pad" style={{ maxWidth: 520, textAlign: "center", padding: "40px 36px" }}>
        <div
          style={{
            width: 52,
            height: 52,
            margin: "0 auto 18px",
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            background: "#fdf1dd",
            color: "#a86400",
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <h1 style={{ fontSize: 19, margin: "0 0 8px", fontWeight: 600, letterSpacing: 0.4 }}>这个页面出了点问题</h1>
        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.9, margin: "0 0 22px" }}>
          数据可能临时不可用，或这次请求触发了异常。可以先重试；如果反复出现，请把下面的错误编号发给技术同学。
        </p>
        {error.digest ? (
          <div className="cell-sub" style={{ marginBottom: 18 }}>
            错误编号：{error.digest}
          </div>
        ) : null}
        <div className="flex" style={{ justifyContent: "center", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => reset()}>
            <RotateCcw size={15} /> 重试
          </button>
          <Link className="btn" href="/">
            <LayoutDashboard size={15} /> 返回看板
          </Link>
        </div>
      </div>
    </div>
  );
}
