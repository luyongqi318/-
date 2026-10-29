"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Results = {
  employees: { id: number; name: string; empNo: string; position: string; department: string }[];
  jobs: { id: number; title: string; department: string }[];
  pages: { href: string; label: string }[];
};

const EMPTY: Results = { employees: [], jobs: [], pages: [] };

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    function onClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults(EMPTY);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults({ employees: data.employees ?? [], jobs: data.jobs ?? [], pages: data.pages ?? [] });
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [q]);

  const flat = [
    ...results.employees.map((e) => () => router.push(`/employees/${e.id}`)),
    ...results.pages.map((p) => () => router.push(p.href)),
    ...results.jobs.map(() => () => router.push("/recruitment")),
  ];

  return (
    <div className="gsearch" ref={boxRef}>
      <Search size={14} className="gsearch-icon" />
      <input
        ref={inputRef}
        className="gsearch-input"
        value={q}
        placeholder="搜索员工、职位、页面…  ⌘K"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && flat[0]) {
            flat[0]();
            setOpen(false);
          }
        }}
      />
      {open && q.trim() ? (
        <div className="gsearch-panel">
          {loading ? <div className="gsearch-hint">搜索中…</div> : null}
          {!loading && !results.employees.length && !results.pages.length && !results.jobs.length ? (
            <div className="gsearch-hint">没有找到「{q}」</div>
          ) : null}

          {results.employees.length ? (
            <div className="gsearch-group">
              <div className="gsearch-label">员工</div>
              {results.employees.map((e) => (
                <button
                  key={e.id}
                  className="gsearch-item"
                  onClick={() => {
                    router.push(`/employees/${e.id}`);
                    setOpen(false);
                  }}
                >
                  <span className="gsearch-avatar">{e.name.slice(0, 1)}</span>
                  <span className="gsearch-main">{e.name}</span>
                  <span className="gsearch-sub">
                    {e.department} · {e.position}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {results.pages.length ? (
            <div className="gsearch-group">
              <div className="gsearch-label">页面</div>
              {results.pages.map((p) => (
                <button
                  key={p.href}
                  className="gsearch-item"
                  onClick={() => {
                    router.push(p.href);
                    setOpen(false);
                  }}
                >
                  <span className="gsearch-main">{p.label}</span>
                  <span className="gsearch-sub">{p.href}</span>
                </button>
              ))}
            </div>
          ) : null}

          {results.jobs.length ? (
            <div className="gsearch-group">
              <div className="gsearch-label">职位</div>
              {results.jobs.map((j) => (
                <button
                  key={j.id}
                  className="gsearch-item"
                  onClick={() => {
                    router.push("/recruitment");
                    setOpen(false);
                  }}
                >
                  <span className="gsearch-main">{j.title}</span>
                  <span className="gsearch-sub">{j.department}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
