import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f7f5f1",
        padding: 24,
        fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#a98a54", textTransform: "uppercase", marginBottom: 12 }}>
          DoubleTree · HR
        </div>
        <h1 style={{ fontSize: 26, margin: "0 0 10px", fontWeight: 600 }}>页面不存在</h1>
        <p style={{ color: "#78838f", fontSize: 13, lineHeight: 1.9, margin: "0 0 22px" }}>
          这个地址没有对应的页面，回到登录页重新进入工作台吧。
        </p>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            padding: "9px 18px",
            borderRadius: 5,
            background: "#0f2130",
            color: "#f6f1e6",
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          前往登录
        </Link>
      </div>
    </div>
  );
}
