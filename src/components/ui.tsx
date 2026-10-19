import type { ReactNode } from "react";

const TONES: Record<string, string> = {
  在职: "green",
  试用期: "blue",
  离职: "gray",
  招聘中: "green",
  已关闭: "gray",
  已暂停: "amber",
  新投递: "blue",
  简历筛选: "gold",
  "待发 offer": "green",
  面试中: "amber",
  已入职: "green",
  已淘汰: "gray",
  已完成: "green",
  学习中: "blue",
  未开始: "gray",
  已逾期: "red",
  正常: "green",
  迟到: "amber",
  请假: "blue",
  缺勤: "red",
  A: "green",
  B: "blue",
  C: "amber",
  D: "red",
  高: "red",
  中: "amber",
  低: "gray",
  已确认: "green",
  待面谈: "amber",
  通过: "green",
  待定: "amber",
  未通过: "red",
  现场: "blue",
  视频: "blue",
  电话: "gray",
  必修: "gold",
};

export function toneOf(label?: string | null): string {
  return TONES[String(label ?? "").trim()] ?? "gray";
}

export function Badge({
  children,
  tone,
  dot = true,
}: {
  children: ReactNode;
  tone?: string;
  dot?: boolean;
}) {
  const t = tone ?? toneOf(typeof children === "string" ? children : "");
  return <span className={`badge badge-${t}${dot ? " badge-dot" : ""}`}>{children}</span>;
}

export function PageHeader({
  title,
  desc,
  actions,
  eyebrow = "DoubleTree · HR Operations",
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        {desc ? <p className="page-desc">{desc}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function Avatar({ name, color }: { name: string; color?: string }) {
  return (
    <span className="avatar-sm" style={{ background: color ?? "#1668a8" }}>
      {name.slice(0, 1)}
    </span>
  );
}

export function Progress({ value, tone }: { value: number; tone?: "green" | "amber" | "red" }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`progress${tone ? " " + tone : ""}`} title={`${v}%`}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}
