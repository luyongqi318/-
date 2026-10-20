import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAgentConfig } from "@/lib/settings";
import { AgentDock } from "@/components/AgentDock";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { getSession } from "@/lib/auth";
import { getRecruitmentStats } from "@/lib/queries";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const stats = getRecruitmentStats();
  const agentConfigured = Boolean(getAgentConfig().apiKey);

  return (
    <div className="shell">
      <Sidebar interviewBadge={stats.active} />
      <div className="main">
        <Topbar user={session.u} />
        <main className="content">{children}</main>
      </div>
      <AgentDock configured={agentConfigured} />
    </div>
  );
}
