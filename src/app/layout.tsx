import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "东锦江希尔顿逸林酒店 · 人力资源平台",
  description: "招聘、培训、员工档案、排班考勤、绩效与 AI 智能体一体化的人力资源工作台",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
