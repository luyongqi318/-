import { redirect } from "next/navigation";
import { BarChart3, ShieldCheck, Sparkles, Users } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="login-page">
      <div className="login-hero">
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div className="brand-mark" style={{ background: "rgba(255,255,255,.12)" }}>
            <Sparkles size={19} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>东锦江希尔顿逸林酒店</div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#8fb0ca" }}>DOUBLETREE HR PLATFORM</div>
          </div>
        </div>

        <div>
          <h1>
            让人力资源工作
            <br />
            少跑一次腿，多省一小时
          </h1>
          <p>招聘、培训、员工档案、排班考勤与绩效，全部收在一个工作台里，并且随时可以问 AI。</p>
          <div className="login-points">
            <div className="login-point">
              <Users size={16} />
              <span>招聘漏斗一屏看清，候选人进度自动汇总</span>
            </div>
            <div className="login-point">
              <BarChart3 size={16} />
              <span>培训完成率、出勤率、绩效分布实时统计</span>
            </div>
            <div className="login-point">
              <ShieldCheck size={16} />
              <span>内网级访问控制，HR 数据只在授权范围内流转</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: "#6f8aa4" }}>
          © 2026 DoubleTree by Hilton Shanghai Pudong · HR 数字化工作台
        </div>
      </div>

      <div className="login-form-wrap">
        <div>
          <div className="login-card">
            <h2>登录工作台</h2>
            <p className="hint">使用酒店 HR 账号登录，演示环境可直接使用下方账号。</p>
            <LoginForm />
            <div className="demo-hint">
              演示账号：<b>hr</b> / 密码：<b>doubletree2026</b>
              <br />
              生产环境请通过 HR_USER、HR_PASS 环境变量覆盖。
            </div>
          </div>
          <div className="login-note">Internal system · 仅限授权员工使用</div>
        </div>
      </div>
    </div>
  );
}
