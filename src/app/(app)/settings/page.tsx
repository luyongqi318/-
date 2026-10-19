import { Database, HardDriveDownload, KeyRound, ShieldCheck } from "lucide-react";
import { AgentSettingsForm } from "@/components/AgentSettingsForm";
import { PasswordForm } from "@/components/PasswordForm";
import { PageHeader } from "@/components/ui";
import { hasCustomPassword } from "@/lib/auth";
import { getAgentConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const config = getAgentConfig();
  const customPassword = hasCustomPassword();

  return (
    <>
      <PageHeader
        title="系统设置"
        desc="智能体模型接入、数据存储与访问说明"
        eyebrow="DoubleTree · System"
      />

      <div className="two-col-wide">
        <div className="grid" style={{ gap: 18 }}>
          <AgentSettingsForm
            initial={{
              configured: Boolean(config.apiKey),
              masked: config.masked,
              baseUrl: config.baseUrl,
              model: config.model,
              source: config.source,
            }}
          />

          <PasswordForm custom={customPassword} />

          <section className="card card-pad">
            <h2 className="card-title" style={{ marginBottom: 12 }}>
              <Database /> 数据存储
            </h2>
            <div className="capability">
              <Database size={15} />
              <div>
                <b>SQLite 单文件数据库</b>
                <span>data/hr.db（随容器磁盘持久化）</span>
              </div>
            </div>
            <div className="capability">
              <KeyRound size={15} />
              <div>
                <b>配置保存在数据库</b>
                <span>修改后立即生效，多个页面共享同一份配置</span>
              </div>
            </div>
            <div className="capability">
              <ShieldCheck size={15} />
              <div>
                <b>访问控制</b>
                <span>所有页面与接口都校验登录会话，未登录自动跳转</span>
              </div>
            </div>
          </section>
        </div>

        <aside className="grid" style={{ gap: 18 }}>
          <section className="card card-pad">
            <h2 className="card-title" style={{ marginBottom: 10 }}>
              <KeyRound /> 支持的模型
            </h2>
            <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.9, margin: 0 }}>
              任何兼容 OpenAI Chat Completions 协议的服务都可以接入，只要支持 Function Calling：
            </p>
            <div className="pill-row" style={{ marginTop: 10 }}>
              <span className="badge badge-gray">DeepSeek</span>
              <span className="badge badge-gray">OpenAI</span>
              <span className="badge badge-gray">通义千问</span>
              <span className="badge badge-gray">智谱 GLM</span>
              <span className="badge badge-gray">Kimi</span>
              <span className="badge badge-gray">自建网关</span>
            </div>
            <p className="muted" style={{ fontSize: 11, lineHeight: 1.9, marginTop: 12, marginBottom: 0 }}>
              常见组合：<br />
              DeepSeek：https://api.deepseek.com · deepseek-chat<br />
              OpenAI：https://api.openai.com/v1 · gpt-4o-mini
            </p>
          </section>

          <section className="card card-pad">
            <h2 className="card-title" style={{ marginBottom: 10 }}>
              <HardDriveDownload /> 数据备份
            </h2>
            <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.9, marginTop: 0, marginBottom: 12 }}>
              下载一份 SQLite 一致性快照（含全部员工、招聘、培训与知识库）。建议在批量导入或大改动前先备份。
            </p>
            <a className="btn" href="/api/backup">
              <HardDriveDownload size={15} /> 下载数据库快照
            </a>
            <p className="muted" style={{ fontSize: 10.5, lineHeight: 1.8, marginTop: 10, marginBottom: 0 }}>
              恢复方式：停止服务，用备份文件替换 <code>data/hr.db</code>，再启动即可。
            </p>
          </section>

          <section className="card card-pad">
            <h2 className="card-title" style={{ marginBottom: 10 }}>
              <ShieldCheck /> 安全建议
            </h2>
            <p className="muted" style={{ fontSize: 11.5, lineHeight: 2, margin: 0 }}>
              1. 上线前修改默认账号密码（HR_USER / HR_PASS）。<br />
              2. 设置足够长的 AUTH_SECRET。<br />
              3. Key 只保存在你自己的服务器上，不会回传给浏览器。<br />
              4. 公网长期使用建议绑定域名并开启 HTTPS。
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
