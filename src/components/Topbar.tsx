"use client";

import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TITLES: Record<string, string> = {
  "/": "数据看板",
  "/recruitment": "招聘管理",
  "/training": "培训与入职",
  "/employees": "员工档案",
  "/data": "数据投喂",
  "/scheduling": "排班与考勤",
  "/performance": "绩效评估",
  "/approvals": "审批中心",
  "/messages": "邮件中心",
  "/audit": "审计日志",
  "/agent": "AI 智能体",
  "/settings": "系统设置",
};

export function Topbar({ user }: { user: string }) {
  const pathname = usePathname();
  const [date, setDate] = useState("");

  useEffect(() => {
    const now = new Date();
    const week = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];
    setDate(`${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 周${week}`);
  }, []);

  const title =
    Object.entries(TITLES).find(([href]) => (href === "/" ? pathname === "/" : pathname.startsWith(href)))?.[1] ??
    "工作台";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="crumb">
          人力资源平台 / <b>{title}</b>
        </span>
      </div>
      <div className="topbar-right">
        <span className="topbar-date" suppressHydrationWarning>
          {date || "—"}
        </span>
        <div className="avatar">HR</div>
        <div className="user-meta">
          <b>{user === "hr" ? "人力资源部" : user}</b>
          <span>HR Administrator</span>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="icon-btn" type="submit" title="退出登录" aria-label="退出登录">
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
