import { Compass, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function AppNotFound() {
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
            background: "#f6f2ea",
            color: "#a98a54",
          }}
        >
          <Compass size={24} />
        </div>
        <h1 style={{ fontSize: 19, margin: "0 0 8px", fontWeight: 600, letterSpacing: 0.4 }}>找不到这个页面</h1>
        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.9, margin: "0 0 22px" }}>
          链接可能已经失效，或者这个板块还没开放。回到看板继续看看吧。
        </p>
        <Link className="btn btn-primary" href="/" style={{ display: "inline-flex" }}>
          <LayoutDashboard size={15} /> 返回看板
        </Link>
      </div>
    </div>
  );
}
