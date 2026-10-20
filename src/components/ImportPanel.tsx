"use client";

import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AutoImportCard } from "./AutoImportCard";

type Entity = { key: string; label: string; desc: string; headers: string[] };
type Result = {
  label: string;
  total: number;
  inserted: number;
  skipped: number;
  replaced?: number;
  batchId?: number;
  errors: { line: number; message: string }[];
  notes: string[];
};

export function ImportPanel({ entities }: { entities: Entity[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [results, setResults] = useState<Record<string, Result>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function upload(entityKey: string, file: File) {
    setBusy(entityKey);
    setErrors((prev) => ({ ...prev, [entityKey]: "" }));
    try {
      const form = new FormData();
      form.append("entity", entityKey);
      form.append("mode", mode);
      form.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "导入失败");
      setResults((prev) => ({ ...prev, [entityKey]: data }));
      router.refresh();
    } catch (err) {
      setErrors((prev) => ({ ...prev, [entityKey]: err instanceof Error ? err.message : "导入失败" }));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <AutoImportCard />
      <details className="import-types" open>
        <summary>按类型导入（可下载模板）</summary>
        <div className="flex" style={{ gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: 11.5 }}>
            这里也遵循上面的导入方式
          </span>
          <select className="select" value={mode} onChange={(e) => setMode(e.target.value as "replace" | "append")} style={{ width: 200 }}>
            <option value="replace">覆盖：替换该类型的现有数据</option>
            <option value="append">追加：保留现有数据</option>
          </select>
        </div>
        <div className="grid cols-2" style={{ marginTop: 16 }}>
          {entities.map((entity) => {
        const result = results[entity.key];
        const error = errors[entity.key];
        return (
          <section className="card card-pad" key={entity.key}>
            <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: 0.3 }}>
                  <FileSpreadsheet size={15} style={{ verticalAlign: -2, marginRight: 6, color: "#a98a54" }} />
                  {entity.label}
                </h3>
                <p className="muted" style={{ fontSize: 11.5, margin: "6px 0 0" }}>
                  {entity.desc}
                </p>
              </div>
              <a className="btn btn-ghost" href={`/api/import/template?entity=${entity.key}`} style={{ paddingRight: 0 }}>
                <Download size={14} /> 模板
              </a>
            </div>

            <div className="pill-row" style={{ marginTop: 12 }}>
              {entity.headers.slice(0, 6).map((h) => (
                <span className="badge badge-gray" key={h}>
                  {h}
                </span>
              ))}
              {entity.headers.length > 6 ? <span className="badge badge-gray">…</span> : null}
            </div>

            <div className="flex" style={{ marginTop: 14, gap: 10 }}>
              <label className="btn btn-primary" style={{ cursor: "pointer" }}>
                {busy === entity.key ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
                {busy === entity.key ? "导入中…" : "选择文件导入"}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(entity.key, file);
                    e.target.value = "";
                  }}
                />
              </label>
              <span className="muted" style={{ fontSize: 10.5 }}>
                支持 CSV / Excel，单次 ≤ 2000 行
              </span>
            </div>

            {error ? <div className="form-error" style={{ marginTop: 12 }}>{error}</div> : null}

            {result ? (
              <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.9 }}>
                <div className="flex" style={{ color: "#2c6a58", gap: 6 }}>
                  <CheckCircle2 size={14} />
                  新增 {result.inserted} 条 · 跳过 {result.skipped} 条 · 错误 {result.errors.length} 条
                  {result.replaced ? ` · 已替换旧数据 ${result.replaced} 条` : ""}
                </div>
                {result.notes.length > 0 ? (
                  <ul className="muted" style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11 }}>
                    {result.notes.slice(0, 3).map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                ) : null}
                {result.errors.length > 0 ? (
                  <div style={{ marginTop: 6 }}>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#9e3b3b" }}>
                      {result.errors.slice(0, 4).map((err, i) => (
                        <li key={i}>
                          第 {err.line} 行：{err.message}
                        </li>
                      ))}
                    </ul>
                    {result.batchId ? (
                      <a className="btn btn-ghost" href={`/api/import/batches/${result.batchId}/errors`} style={{ padding: "2px 0", fontSize: 11 }}>
                        下载全部 {result.errors.length} 条错误明细
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
        </div>
      </details>
    </>
  );
}
