"use client";

import { CheckCircle2, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Detected = { label: string; matched: number; total: number; columns: { target: string; source: string }[] };
type ImportResult = {
  label: string;
  total: number;
  inserted: number;
  skipped: number;
  errors: { line: number; message: string }[];
  notes: string[];
  detected?: Detected;
};

export function AutoImportCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const form = new FormData();
      form.append("entity", "auto");
      form.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "导入失败");
      setResult(data as ImportResult);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-pad" style={{ marginBottom: 18 }}>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h2 className="card-title">
            <Sparkles /> 智能识别导入
          </h2>
          <p className="muted" style={{ fontSize: 11.5, margin: "6px 0 0" }}>
            直接把 Excel / CSV 拖进来，系统自动判断是员工、职位、候选人、课程还是培训任务，并自动对齐表头。
          </p>
        </div>
        <span className="badge badge-gold">自动分类</span>
      </div>

      <div
        className={`dropzone${dragging ? " drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        {busy ? <Loader2 size={22} className="spin" /> : <UploadCloud size={22} />}
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>
          {busy ? "正在识别并写入…" : "拖拽文件到这里，或点击选择"}
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
          支持 .xlsx / .xls / .csv，单次 ≤ 2000 行，表头前有标题行也能识别
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>

      {error ? <div className="form-error" style={{ marginTop: 12 }}>{error}</div> : null}

      {result ? (
        <div style={{ marginTop: 14, fontSize: 12 }}>
          <div className="flex" style={{ gap: 8, color: "#2c6a58", fontWeight: 600 }}>
            <CheckCircle2 size={15} />
            识别为「{result.detected?.label ?? result.label}」
            {result.detected ? (
              <span className="muted" style={{ fontWeight: 400 }}>
                · 自动匹配 {result.detected.matched}/{result.detected.total} 列
              </span>
            ) : null}
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            共 {result.total} 行 · 新增 {result.inserted} 条 · 跳过 {result.skipped} 条
            {result.errors.length ? ` · 错误 ${result.errors.length} 条` : ""}
          </div>
          {result.detected?.columns?.length ? (
            <div className="pill-row" style={{ marginTop: 8 }}>
              {result.detected.columns.slice(0, 8).map((c) => (
                <span className="badge badge-gray" key={c.target}>
                  {c.source} → {c.target}
                </span>
              ))}
            </div>
          ) : null}
          {result.errors.length ? (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 11, color: "#9e3b3b" }}>
              {result.errors.slice(0, 3).map((err, i) => (
                <li key={i}>
                  第 {err.line} 行：{err.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
