import { Database, FileText, Lightbulb, ShieldCheck, Sparkles, Users } from "lucide-react";
import { AgentChat } from "@/components/AgentChat";
import { Badge, PageHeader } from "@/components/ui";
import { getAgentConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function AgentPage() {
  const config = getAgentConfig();
  const hasKey = Boolean(config.apiKey);

  return (
    <>
      <PageHeader
        title="AI 智能体"
        desc="读取招聘、培训、员工、排班与绩效数据，回答问题并生成可用文档"
        actions={<Badge tone={hasKey ? "green" : "amber"}>{hasKey ? "已接入模型 API" : "演示模式（未配置 Key）"}</Badge>}
      />

      <div className="agent-page">
        <section className="agent-page-main">
          <div className="agent-head">
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 4,
                border: "1px solid rgba(200,168,106,.45)",
                display: "grid",
                placeItems: "center",
                color: "#c8a86a",
              }}
            >
              <Sparkles size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="agent-title">HR 智能助手</div>
              <div className="agent-sub">DoubleTree Shanghai Pudong · Human Resources</div>
            </div>
            <span className="agent-sub">数据实时读取</span>
          </div>
          <AgentChat
            variant="page"
            configured={hasKey}
            suggestions={[
              "本周招聘进展如何？哪个岗位缺口最大？",
              "给餐饮部新员工做一份培训方案",
              "帮我写一份客房服务员的招聘 JD",
              "给我一套客房服务员的面试提纲",
            ]}
          />
        </section>

        <aside className="grid" style={{ gap: 18 }}>
          <section className="card card-pad">
            <h2 className="card-title" style={{ marginBottom: 8 }}>
              <Lightbulb /> 能帮你做什么
            </h2>
            <div className="capability">
              <Users size={15} />
              <div>
                <b>招聘进展问答</b>
                <span>缺口、漏斗转化、候选人卡在哪个阶段</span>
              </div>
            </div>
            <div className="capability">
              <FileText size={15} />
              <div>
                <b>文档成稿</b>
                <span>招聘 JD、面试提纲、培训通知、绩效面谈提纲</span>
              </div>
            </div>
            <div className="capability">
              <Database size={15} />
              <div>
                <b>数据查询</b>
                <span>培训逾期、考勤异常、绩效分布、部门编制</span>
              </div>
            </div>
            <div className="capability">
              <ShieldCheck size={15} />
              <div>
                <b>制度问答</b>
                <span>试用期、排班、年假、离职交接等酒店 HR 政策</span>
              </div>
            </div>
          </section>

          <section className="card card-pad">
            <h2 className="card-title" style={{ marginBottom: 10 }}>
              <Database /> {hasKey ? "当前模型接入" : "接入自己的模型"}
            </h2>
            {hasKey ? (
              <>
                <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.9, marginTop: 0 }}>
                  已接入 <b style={{ color: "var(--ink)" }}>{config.model}</b>
                  <br />
                  网关：{config.baseUrl}
                  <br />
                  来源：{config.source === "db" ? "系统设置（本地数据库）" : "环境变量"}
                </p>
                <a className="btn" href="/settings" style={{ marginTop: 6 }}>
                  前往系统设置更换
                </a>
              </>
            ) : (
              <>
                <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.9, marginTop: 0 }}>
                  在项目根目录 <code>.env.local</code> 中配置，重启后生效：
                </p>
                <pre
                  style={{
                    background: "#fbf9f5",
                    border: "1px solid var(--line)",
                    borderRadius: 4,
                    padding: "10px 12px",
                    fontSize: 11,
                    lineHeight: 1.9,
                    overflowX: "auto",
                    color: "#35424f",
                  }}
                >
                  {`DEEPSEEK_API_KEY=sk-xxxx
AGENT_MODEL=deepseek-chat
AGENT_BASE_URL=https://api.deepseek.com`}
                </pre>
              </>
            )}
            <p className="muted" style={{ fontSize: 11, lineHeight: 1.8, marginBottom: 0 }}>
              兼容任意 OpenAI 协议的网关（通义、智谱、Kimi、自建代理）只需改 BASE_URL 与模型名。
            </p>
          </section>

          <section className="card card-pad">
            <h2 className="card-title" style={{ marginBottom: 8 }}>
              <ShieldCheck /> 数据边界
            </h2>
            <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.9, margin: 0 }}>
              智能体只读取本系统数据库中的聚合与明细数据，不包含身份证号、银行卡等敏感字段；模型请求仅发送你的问题与查询结果。
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
