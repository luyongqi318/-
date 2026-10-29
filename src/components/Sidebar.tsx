import {
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Network,
  FileBarChart,
  ScrollText,
  Settings,
  Sparkles,
  Target,
  Upload,
  Users,
} from "lucide-react";
import { NavLink } from "./NavLink";

export function Sidebar({ interviewBadge }: { interviewBadge?: number }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">DT</div>
        <div>
          <div className="brand-name">东锦江希尔顿逸林酒店</div>
          <div className="brand-sub">DoubleTree HR</div>
        </div>
      </div>

      <div className="nav-group-label">工作台</div>
      <nav className="nav">
        <NavLink href="/" label="数据看板" icon={<LayoutDashboard />} />
        <NavLink href="/recruitment" label="招聘管理" icon={<Briefcase />} badge={interviewBadge} />
        <NavLink href="/training" label="培训与入职" icon={<GraduationCap />} />
        <NavLink href="/employees" label="员工档案" icon={<Users />} />
        <NavLink href="/org" label="组织架构" icon={<Network />} />
        <NavLink href="/data" label="数据投喂" icon={<Upload />} />
      </nav>

      <div className="nav-group-label">运营</div>
      <nav className="nav">
        <NavLink href="/approvals" label="审批中心" icon={<ClipboardCheck />} />
        <NavLink href="/admin" label="行政台账" icon={<Building2 />} />
        <NavLink href="/messages" label="邮件中心" icon={<Mail />} />
        <NavLink href="/scheduling" label="排班与考勤" icon={<CalendarClock />} />
        <NavLink href="/performance" label="绩效评估" icon={<Target />} />
        <NavLink href="/reports" label="报表中心" icon={<FileBarChart />} />
        <NavLink href="/audit" label="审计日志" icon={<ScrollText />} />
      </nav>

      <div className="nav-group-label">智能助手</div>
      <nav className="nav">
        <NavLink href="/agent" label="AI 智能体" icon={<Sparkles />} />
        <NavLink href="/settings" label="系统设置" icon={<Settings />} />
      </nav>

      <div className="sidebar-foot">
        <strong>HR 工作台 v0.1</strong>
        <br />
        招聘 · 培训 · 排班 · 绩效
        <br />
        数据为演示样例，可替换为真实数据源
      </div>
    </aside>
  );
}
