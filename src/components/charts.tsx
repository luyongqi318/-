import { AnimatedNumber } from "./AnimatedNumber";

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: { bg: string; fg: string };
}) {
  return (
    <div className="card stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        <AnimatedNumber value={value} />
        {unit ? <small>{unit}</small> : null}
      </div>
      {hint ? <div className="stat-foot">{hint}</div> : null}
      {icon ? (
        <div className="stat-icon" style={accent ? { background: accent.bg, color: accent.fg } : undefined}>
          {icon}
        </div>
      ) : null}
    </div>
  );
}

export function BarList({
  items,
  color = "#1668a8",
  valueSuffix = "",
  max,
}: {
  items: { label: string; value: number; color?: string }[];
  color?: string;
  valueSuffix?: string;
  max?: number;
}) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="chart-wrap">
      <div className="bar-list">
        {items.map((item, i) => (
          <div className="bar-row" key={item.label}>
            <span className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.label}
            </span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${Math.max(3, (item.value / top) * 100)}%`,
                  background: item.color ?? color,
                  animationDelay: `${i * 70}ms`,
                }}
              />
            </div>
            <span className="bar-value">
              {item.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Donut({
  value,
  size = 132,
  stroke = 14,
  color = "#1668a8",
  track = "#edf1f6",
  centerLabel,
  centerSub,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  centerLabel?: string;
  centerSub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <svg className="donut-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${pct}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.19}
        fontWeight={700}
        fill="#122033"
      >
        {centerLabel ?? `${pct}%`}
      </text>
      {centerSub ? (
        <text x="50%" y="64%" textAnchor="middle" fontSize={size * 0.085} fill="#7b8aa0">
          {centerSub}
        </text>
      ) : null}
    </svg>
  );
}

export function Funnel({ items }: { items: { stage: string; value: number }[] }) {
  const top = Math.max(1, ...items.map((i) => i.value));
  const colors = ["#a9c0cf", "#7fa3b8", "#567f97", "#35617b", "#1c435c"];
  return (
    <div className="funnel">
      {items.map((item, i) => (
        <div className="funnel-row" key={item.stage}>
          <span className="funnel-label">{item.stage}</span>
          <div
            className="funnel-bar"
            style={{
              width: `${Math.max(9, (item.value / top) * 100)}%`,
              background: colors[i % colors.length],
              animationDelay: `${i * 80}ms`,
            }}
          >
            {item.value}
          </div>
          {i > 0 && items[i - 1].value > 0 ? (
            <span className="muted" style={{ fontSize: 11 }}>
              转化 {Math.round((item.value / items[i - 1].value) * 100)}%
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function MiniBars({ items }: { items: { label: string; value: number }[] }) {
  const top = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 96, padding: "4px 20px 18px" }}>
      {items.map((item, i) => (
        <div key={item.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#7b8aa0" }}>{item.value}</div>
          <div
            className="mini-bar"
            style={{
              width: "100%",
              maxWidth: 34,
              height: Math.max(6, (item.value / top) * 58),
              borderRadius: 6,
              background: "linear-gradient(180deg, #4f9dd0, #1668a8)",
              animationDelay: `${i * 70}ms`,
            }}
          />
          <div style={{ fontSize: 11, color: "#7b8aa0" }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}
