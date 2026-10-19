"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STAGES = ["新投递", "简历筛选", "面试中", "待发 offer", "已入职", "已淘汰"];

export function CandidateStageSelect({ id, stage }: { id: number; stage: string }) {
  const router = useRouter();
  const [value, setValue] = useState(stage);
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    const prev = value;
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch("/api/recruitment/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stage: next }),
      });
      if (!res.ok) throw new Error("更新失败");
      router.refresh();
    } catch {
      setValue(prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      className="select"
      style={{ height: 28, fontSize: 11.5, padding: "0 6px" }}
      value={value}
      disabled={saving}
      onChange={(e) => void change(e.target.value)}
      aria-label="更新候选人阶段"
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
