"use client";

import { Download } from "lucide-react";
import { useRef } from "react";

export type ChartSpec = {
  type: "bar" | "pie";
  title?: string;
  unit?: string;
  data: { label: string; value: number }[];
};

const PALETTE = ["#8a6a3a", "#c9a869", "#4f7f74", "#a8763e", "#6b5b8a", "#3f6f8f", "#8c4a4a", "#5a6570", "#6b6a4f"];

function BarChart({ spec }: { spec: ChartSpec }) {
  const data = spec.data.slice(0, 12);
  const max = Math.max(1, ...data.map((d) => d.value));
  const rowH = 34;
  const width = 640;
  const labelW = 120;
  const valueW = 70;
  const height = data.length * rowH + 24;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={spec.title ?? "图表"}>
      {data.map((item, i) => {
        const y = i * rowH + 12;
        const barW = ((width - labelW - valueW - 40) * item.value) / max;
        return (
          <g key={item.label}>
            <text x={0} y={y + 18} fontSize="13" fill="#3d4f66">
              {item.label}
            </text>
            <rect x={labelW} y={y + 5} width={width - labelW - valueW - 30} height={14} rx={7} fill="#f1ece2" />
            <rect x={labelW} y={y + 5} width={Math.max(6, barW)} height={14} rx={7} fill={PALETTE[i % PALETTE.length]} />
            <text x={width} y={y + 18} fontSize="13" textAnchor="end" fill="#1b242c" fontWeight="600">
              {item.value}
              {spec.unit ?? ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PieChart({ spec }: { spec: ChartSpec }) {
  const data = spec.data.slice(0, 10);
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0) || 1;
  const size = 260;
  const radius = 100;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -Math.PI / 2;

  const arcs = data.map((item, i) => {
    const sweep = (Math.max(0, item.value) / total) * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    return { item, d: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`, color: PALETTE[i % PALETTE.length] };
  });

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={spec.title ?? "图表"}>
        {arcs.map((arc, i) => (
          <path key={i} d={arc.d} fill={arc.color} stroke="#fffdfa" strokeWidth="2" />
        ))}
        <circle cx={cx} cy={cy} r={radius * 0.52} fill="#fffdfa" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="600" fill="#1b242c">
          {total}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11" fill="#78838f">
          {spec.unit ?? "合计"}
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
        {data.map((item, i) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: PALETTE[i % PALETTE.length] }} />
            <span style={{ color: "#3d4f66" }}>{item.label}</span>
            <span style={{ color: "#78838f" }}>
              {item.value}
              {spec.unit ?? ""} · {Math.round((item.value / total) * 1000) / 10}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartBlock({ spec }: { spec: ChartSpec }) {
  const boxRef = useRef<HTMLDivElement>(null);

  if (!spec?.data?.length) return null;

  async function downloadPng() {
    const svg = boxRef.current?.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const width = Number(svg.getAttribute("width")) || 640;
    clone.setAttribute("width", String(width));
    const source = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("render failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width || 720;
    canvas.height = img.height || 420;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fffdfa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${spec.title || "chart"}.png`;
    link.click();
  }

  return (
    <figure className="chart-block">
      <figcaption>
        <span>{spec.title || "数据图表"}</span>
        <button className="msg-action" onClick={() => void downloadPng()}>
          <Download size={12} /> PNG
        </button>
      </figcaption>
      <div ref={boxRef} className="chart-block-body">
        {spec.type === "pie" ? <PieChart spec={spec} /> : <BarChart spec={spec} />}
      </div>
    </figure>
  );
}
