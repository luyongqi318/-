import {
  getCandidates,
  getDashboard,
  getEmployees,
  getJobs,
  getPerformance,
  getRecruitmentStats,
  getScheduling,
  getTraining,
} from "./queries";
import { getAgentConfig } from "./settings";
import { findKnowledge, knowledgePrompt } from "./knowledge";

const MAX_HISTORY_MESSAGES = 200;
const MAX_MESSAGE_CHARS = 8000;
const MAX_CONTEXT_CHARS = 24000;

const SYSTEM_PROMPT = `你是「上海东锦江希尔顿逸林酒店」的人力资源智能助手，服务对象是酒店 HR 与部门负责人。

【回答准则】
1. 用简体中文，先给结论，再给 2-4 条依据；语气专业、简洁，不要写套话和免责声明。
2. 所有数字必须来自工具返回的数据；没有数据就说明"系统里暂时没有这项数据"，禁止编造。
3. 涉及人名的信息只用于工作沟通，不评价员工个人品格；绩效结论引用具体分数和等级。
4. 用户要 JD、面试提纲、培训计划、通知邮件时，直接输出可用的成稿，不要只给提纲。
5. 一次回答控制在 6 行以内；需要列表时最多 5 条。
6. 例外：当用户要的是「制度、方案、JD、培训计划、汇报材料」这类成稿时，要写完整、可直接使用，可以用多级标题和长文，篇幅不设上限（通常 800–2000 字），并在结尾给出可直接执行的下一步。

【酒店 HR 制度要点】（回答政策类问题时使用）
- 招聘流程：简历筛选 → HR 初试 → 部门复试 → 背景调查 → 发放 offer → 入职。平均周期 2-4 周。
- 试用期：3-6 个月，转正评估需在到期前 15 天由直属主管提交。
- 培训：新员工入职 30 天内须完成《新员工入职引导》《希尔顿品牌服务标准》《消防与应急疏散》；餐饮与厨房岗位另需《食品安全与卫生 HACCP》。
- 排班：早班 07:00-15:00，中班 15:00-23:00，晚班 23:00-07:00；连续工作不超过 6 天。
- 考勤：迟到 15 分钟内记迟到，超过 30 分钟按事假半天处理；月累计迟到 3 次进入提醒流程。
- 绩效：季度评估，A ≥ 90 分，B ≥ 80 分，C ≥ 70 分，D < 70 分；C 及以下需制定改进计划。
- 合同：到期前 30 天由 HR 发起续签沟通。
- 离职：提前 30 天书面申请，完成交接清单与资产归还。

【图表】
用户要「图 / 饼图 / 柱状图 / 占比 / 可视化」，或数据本身适合对比时，**必须直接出图**，不要说做不到。在回答里输出一个 chart 代码块（前端会渲染并可下载 PNG）：

\`\`\`chart
{"type":"pie","title":"部门人数占比","unit":"人","data":[{"label":"客房部","value":34},{"label":"餐饮部","value":25}]}
\`\`\`

type 只支持 bar / pie；data 最多 10 项；数字必须来自工具查询结果，不要编造。

【可用工具】组织概览、在招职位、招聘漏斗、培训进度、考勤排班、绩效、员工检索。`;

/** 系统提示 = 基础规则 + 用户投喂的制度资料（优先生效）。 */
function buildSystemPrompt(): string {
  const kb = knowledgePrompt(10, 20000);
  if (!kb) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\n【酒店内部资料（用户投喂，回答制度与流程问题时优先引用）】\n${kb}`;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_hr_overview",
      description: "读取酒店人力总览：在编人数、待招职位与缺口、本月入职、培训完成率、今日出勤率、绩效达标率、离职率。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_open_positions",
      description: "列出在招职位：职位、部门、需求人数、已招人数、缺口、优先级、已挂天数、候选人数。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recruitment_pipeline",
      description: "读取招聘漏斗与候选人分布：各阶段人数、平均招聘周期、本周面试数、候选人明细。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_training_status",
      description: "读取培训任务：可按状态（已逾期/学习中/未开始/已完成）或员工姓名筛选，返回课程、进度、截止日期。",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "可选：已逾期、学习中、未开始、已完成" },
          employee: { type: "string", description: "可选：员工姓名关键字" },
          limit: { type: "integer", minimum: 1, maximum: 40 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_attendance_overview",
      description: "读取今日考勤与本周排班概况：出勤率、迟到/缺勤/请假人数、各班组人数。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_performance_overview",
      description: "读取绩效评估：周期、参评人数、平均分、达标率、A/B/C/D 分布，可指定周期。",
      parameters: {
        type: "object",
        properties: { period: { type: "string", description: "可选，如 2026 Q3" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_employees",
      description: "按姓名、工号、职位或部门关键字检索员工，返回部门、职位、入职日期、状态、合同到期日。",
      parameters: {
        type: "object",
        properties: {
          keyword: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 20 },
        },
        required: ["keyword"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_department_headcount",
      description: "读取各部门在编人数与编制上限，用于判断缺编情况。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

type ToolCall = { tool: string; ok: boolean };

function runTool(name: string, args: Record<string, any>): { data: any; ok: boolean } {
  try {
    switch (name) {
      case "get_hr_overview": {
        const d = getDashboard();
        return { data: d.kpi, ok: true };
      }
      case "list_open_positions": {
        const jobs = getJobs()
          .filter((j) => j.status === "招聘中")
          .map((j) => ({
            职位: j.title,
            部门: j.department,
            需求: j.headcount,
            已招: j.filled,
            缺口: j.headcount - j.filled,
            优先级: j.priority,
            已挂天数: j.days_open,
            候选人数: j.applicants,
          }));
        return { data: jobs, ok: true };
      }
      case "get_recruitment_pipeline": {
        const stats = getRecruitmentStats();
        const cands = getCandidates();
        const stages = ["新投递", "简历筛选", "面试中", "待发 offer", "已入职"];
        const funnel = stages.map((s) => ({ 阶段: s, 人数: cands.filter((c) => c.stage === s).length }));
        return {
          data: {
            概况: stats,
            漏斗: funnel,
            候选人: cands.slice(0, 12).map((c) => ({
              姓名: c.name,
              应聘: c.job,
              阶段: c.stage,
              来源: c.source,
              投递日期: c.applied_at,
            })),
          },
          ok: true,
        };
      }
      case "get_training_status": {
        const t = getTraining();
        let rows = t.enrollments as any[];
        if (args.status) rows = rows.filter((r) => r.status === args.status);
        if (args.employee) rows = rows.filter((r) => String(r.employee).includes(String(args.employee)));
        const limit = Math.min(Number(args.limit) || 12, 40);
        return {
          data: {
            整体: t.stats,
            明细: rows.slice(0, limit).map((r) => ({
              员工: r.employee,
              部门: r.department,
              课程: r.course,
              进度: `${r.progress}%`,
              状态: r.status,
              截止: r.due_date,
            })),
          },
          ok: true,
        };
      }
      case "get_attendance_overview": {
        const s = getScheduling();
        return {
          data: {
            今日: s.attStats,
            排班周: `${s.start} 起`,
            今日异常: s.attendanceToday
              .filter((a: any) => a.status !== "正常")
              .slice(0, 10)
              .map((a: any) => ({ 员工: a.employee, 部门: a.department, 状态: a.status, 打卡: `${a.clock_in || "-"} / ${a.clock_out || "-"}` })),
          },
          ok: true,
        };
      }
      case "get_performance_overview": {
        const p = getPerformance(args.period);
        return {
          data: {
            周期: p.selected,
            统计: p.stats,
            分布: p.dist,
            待面谈: p.reviews
              .filter((r: any) => r.status !== "已确认")
              .slice(0, 8)
              .map((r: any) => ({ 员工: r.employee, 部门: r.department, 分数: r.score, 等级: r.grade })),
          },
          ok: true,
        };
      }
      case "search_employees": {
        const kw = String(args.keyword || "").trim();
        const rows = kw
          ? getEmployees({ q: kw }).slice(0, Math.min(Number(args.limit) || 8, 20))
          : [];
        return {
          data: rows.map((e) => ({
            姓名: e.name,
            工号: e.emp_no,
            部门: e.department,
            职位: e.position,
            入职: e.hire_date,
            状态: e.status,
            合同到期: e.contract_end,
          })),
          ok: true,
        };
      }
      case "get_department_headcount": {
        const d = getDashboard();
        return {
          data: d.departments.map((dep: any) => ({
            部门: dep.name,
            在编: dep.n,
            编制: dep.target_headcount,
            缺口: Math.max(0, dep.target_headcount - dep.n),
          })),
          ok: true,
        };
      }
      default:
        return { data: { error: `未知工具 ${name}` }, ok: false };
    }
  } catch (err) {
    return { data: { error: `查询失败: ${err instanceof Error ? err.message : "未知错误"}` }, ok: false };
  }
}

type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_calls?: any; tool_call_id?: string };

async function callModel(
  messages: ChatMessage[],
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.25,
        max_tokens: 8000,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`模型接口 HTTP ${res.status}${res.status === 401 ? "（API Key 未通过验证）" : ""} ${text.slice(0, 200)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function askAgent(
  history: { role: "user" | "assistant"; content: string }[],
): Promise<{ reply: string; tools: ToolCall[]; model: string; demo: boolean }> {
  const config = getAgentConfig();
  const clean = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

  // 按字符预算保留尽量多的上下文（从最新往前取，避免超长对话把请求撑爆）
  const budgeted: { role: "user" | "assistant"; content: string }[] = [];
  let usedChars = 0;
  for (let i = clean.length - 1; i >= 0; i -= 1) {
    const item = clean[i];
    if (usedChars + item.content.length > MAX_CONTEXT_CHARS && budgeted.length >= 2) break;
    budgeted.unshift(item);
    usedChars += item.content.length;
  }
  const context = budgeted.length ? budgeted : clean.slice(-2);

  if (!config.apiKey) {
    return demoAnswer(clean);
  }

  const messages: ChatMessage[] = [{ role: "system", content: buildSystemPrompt() }, ...context];
  const used: ToolCall[] = [];

  for (let round = 0; round < 4; round += 1) {
    const data = await callModel(messages, config.apiKey, config.baseUrl, config.model);
    const message = data?.choices?.[0]?.message;
    if (!message) throw new Error("模型返回内容为空");
    const toolCalls = message.tool_calls as any[] | undefined;
    if (!toolCalls || toolCalls.length === 0) {
      const reply = String(message.content || "").trim();
      if (!reply) throw new Error("模型返回了空回答");
      return { reply, tools: used, model: config.model, demo: false };
    }
    messages.push({ role: "assistant", content: message.content || "", tool_calls: toolCalls });
    for (const call of toolCalls) {
      const name = call?.function?.name ?? "";
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(call?.function?.arguments || "{}");
      } catch {
        args = {};
      }
      const result = runTool(name, args);
      used.push({ tool: name, ok: result.ok });
      messages.push({
        role: "tool",
        tool_call_id: call?.id ?? name,
        content: JSON.stringify(result.data).slice(0, 8000),
      });
    }
  }
  throw new Error("工具调用轮次过多，请把问题拆小一点");
}

/* ------------------------------------------------------------------ */
/* 演示模式：没有配置 API Key 时，用本地数据生成确定性回答，便于验收 UI */
/* ------------------------------------------------------------------ */

function fmtPct(n: number) {
  return `${Math.round(n * 10) / 10}%`;
}

const DEPT_NAMES = ["前厅部", "客房部", "餐饮部", "厨房", "销售部", "人力资源部", "工程部", "保安部", "财务部"];

const POLICY_RULES: { keys: string[]; title: string; answer: string }[] = [
  {
    keys: ["年假", "休假", "婚假", "病假", "产假"],
    title: "休假制度（演示版摘要）",
    answer:
      "年假按司龄计算：满 1 年 5 天、满 3 年 7 天、满 5 年 10 天；提前 3 个工作日在系统提交，经部门排班确认后生效，当年未休完可顺延至次年 3 月 31 日。\n病假需提供二级以上医院证明；婚假 3 天，产假按当地规定执行。",
  },
  {
    keys: ["试用期", "转正"],
    title: "试用期与转正（演示版摘要）",
    answer:
      "试用期 3–6 个月，转正评估在到期前 15 天由直属主管提交，HR 在 5 个工作日内完成审批。评估不通过可延长一次（不超过 1 个月），或按流程终止并结算。",
  },
  {
    keys: ["离职", "辞职", "交接"],
    title: "离职流程（演示版摘要）",
    answer:
      "提前 30 天提交书面离职申请 → 部门安排交接 → 归还工牌、制服、钥匙与设备 → HR 在最后工作日办理离职手续并结算薪资。未完成交接的，按员工手册暂缓办理。",
  },
  {
    keys: ["合同", "续签"],
    title: "合同续签（演示版摘要）",
    answer: "合同到期前 30 天由 HR 发起续签沟通，部门在 10 个工作日内反馈是否续签及岗位安排；到期未续签的按终止处理。",
  },
  {
    keys: ["排班制度", "班次", "三班"],
    title: "排班规则（演示版摘要）",
    answer:
      "三班制：早班 07:00–15:00，中班 15:00–23:00，晚班 23:00–07:00。连续工作不超过 6 天，班次调整需提前 2 天在排班表确认；临时调班由部门主管在系统发起。",
  },
  {
    keys: ["考勤制度", "打卡规定", "迟到怎么"],
    title: "考勤规则（演示版摘要）",
    answer:
      "迟到 15 分钟内记迟到，超过 30 分钟按事假半天处理；月累计迟到 3 次进入提醒流程。代打卡按严重违纪处理，缺勤需当日补交说明。",
  },
];

function demoAnswer(history: { role: "user" | "assistant"; content: string }[]) {
  const question = history.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
  const q = question.toLowerCase();
  const used: ToolCall[] = [];
  const parts: string[] = [];

  const wants = (words: string[]) => words.some((w) => q.includes(w));

  if (wants(["面试题", "面试提纲", "面试问题", "面试怎么问", "面试问什么"])) {
    const jobs = getJobs();
    const job =
      jobs.find((j) => question.includes(j.title)) ??
      jobs.find((j) => j.title.includes("前台")) ??
      jobs[0];
    used.push({ tool: "list_open_positions", ok: true });
    return {
      demo: true,
      model: "本地演示模式",
      tools: used,
      reply: `【${job.department} · ${job.title}】结构化面试提纲（演示模式草稿）\n\n一、动机与稳定性（5 分钟）\n1. 为什么选择酒店行业？为什么是希尔顿逸林？\n2. 上一份工作做了多久，离职原因是什么？\n\n二、服务意识（行为面试，STAR）\n3. 请讲一次你处理客人投诉的经历：当时情况、你怎么做、结果如何？\n4. 如果客人对房间不满意而当天满房，你会怎么处理？\n\n三、岗位技能\n5. ${job.title}日常最容易出错的环节是什么？你怎么避免？\n6. 遇到跨部门协作卡住（例如客房与前台），你会怎么推进？\n\n四、价值观与合规\n7. 发现同事违反食品安全或消防规定，你会怎么做？\n\n评估建议：服务意识 40%、岗位技能 30%、稳定性 20%、价值观 10%；每题 1–5 分记录，低于 3 分需二次确认。\n\n配置 API Key 后，我可以结合候选人简历定制追问。`,
    };
  }

  if (wants(["培训方案", "培训计划", "培训安排", "带训"])) {
    const t = getTraining();
    const courses = t.courses as any[];
    const dept = DEPT_NAMES.find((d) => question.includes(d)) ?? "客房部";
    const rows = (t.enrollments as any[]).filter((e) => e.department === dept);
    const done = rows.filter((e) => e.status === "已完成").length;
    const rate = rows.length ? Math.round((done / rows.length) * 100) : t.stats.rate;
    const pickCourse = (kw: string) => courses.find((c) => String(c.title).includes(kw));
    const line = (kw: string, fallback: string, minutes: number) => {
      const course = pickCourse(kw);
      return `${course?.title ?? fallback}（${course?.duration_min ?? minutes} 分钟）`;
    };
    used.push({ tool: "get_training_status", ok: true });
    return {
      demo: true,
      model: "本地演示模式",
      tools: used,
      reply: `【${dept}】新员工 30 天培训方案（演示模式草稿）\n\n第 1 周｜融入与品牌\n· ${line("入职引导", "新员工入职引导", 60)}\n· ${line("品牌服务标准", "希尔顿品牌服务标准", 90)}\n\n第 2 周｜安全与岗位技能\n· ${line("消防", "消防与应急疏散", 45)}\n· ${["餐饮部", "厨房"].includes(dept) ? line("食品安全", "食品安全与卫生 HACCP", 120) : line("客房清洁", "客房清洁标准作业", 100)}\n· 师傅一对一带岗 3 天，按检查表逐项打勾\n\n第 3 周｜服务进阶\n· ${line("投诉", "宾客投诉处理技巧", 75)}\n· 早会旁听 + 主管跟岗独立值一个班次\n\n第 4 周｜考核与转正\n· 笔试 ≥ 80 分 + 实操考核（主管签字）\n· 输出个人改进计划，进入 90 天跟踪\n\n数据参考：${dept} 当前培训完成率 ${rate}%（${done}/${rows.length} 项）。\n\n配置 API Key 后，我可以按岗位、班次和课程表细化到每天。`,
    };
  }

  if (wants(["jd", "招聘启事", "职位描述"]) || (wants(["写一份", "起草", "文案"]) && wants(["招聘", "职位", "岗位"]))) {
    const jobs = getJobs();
    const job =
      jobs.find((j) => question.includes(j.title)) ??
      jobs.find((j) => j.title.includes("前台")) ??
      jobs[0];
    used.push({ tool: "list_open_positions", ok: true });
    return {
      demo: true,
      model: "本地演示模式",
      tools: used,
      reply: `【${job.department} · ${job.title}】招聘 JD（演示模式草稿，可直接改用）\n\n岗位职责：\n1. 按希尔顿品牌服务标准完成当班岗位的日常服务与交接；\n2. 主动识别宾客需求，处理常见问询并将复杂问题升级至主管；\n3. 维护岗位区域整洁、物资齐备，执行安全与卫生规范；\n4. 参加班前会、服务复盘与月度培训，完成考核。\n\n任职要求：\n1. 高中及以上学历，有酒店或高端服务业经验优先；\n2. 普通话流利，具备基础英语沟通能力；\n3. 能适应早/中/晚三班轮班，形象端正、服务意识强；\n4. 持健康证（餐饮、厨房岗位另需食品安全培训合格）。\n\n薪资：${job.salary_min}–${job.salary_max} 元/月，另有班次补贴与全勤奖。\n\n配置 DEEPSEEK_API_KEY 后，我可以按你的具体要求重写这份 JD。`,
    };
  }

  if (wants(["部门", "占比", "饼图", "柱状图", "人数分布", "可视化"])) {
    const d = getDashboard();
    const data = d.departments.map((dep: any) => ({ label: dep.name, value: dep.n }));
    const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
    used.push({ tool: "get_department_headcount", ok: true });
    const spec = JSON.stringify({ type: "pie", title: "部门人数占比", unit: "人", data });
    return {
      demo: true,
      model: "本地演示模式",
      tools: used,
      reply:
        "各部门人数与占比如下（图可直接下载 PNG）：\n\n```chart\n" +
        spec +
        "\n```\n\n合计 " +
        total +
        " 人。如需「一线运营 vs 后台职能」两分组，或改成柱状图，跟我说一声。",
    };
  }

  const kbHit = findKnowledge(question);
  if (kbHit) {
    used.push({ tool: "knowledge_base", ok: true });
    const excerpt = kbHit.content.slice(0, 600);
    return {
      demo: true,
      model: "本地演示模式",
      tools: used,
      reply: `【${kbHit.title}】\n${excerpt}${kbHit.content.length > 600 ? "…" : ""}\n\n（来自你投喂的资料；配置 API Key 后可以基于全文做归纳与追问。）`,
    };
  }

  const policy = POLICY_RULES.find((rule) => rule.keys.some((k) => question.includes(k)));
  if (policy) {
    used.push({ tool: "policy_kb", ok: true });
    return {
      demo: true,
      model: "本地演示模式",
      tools: used,
      reply: `${policy.title}\n\n${policy.answer}\n\n（以上为演示版制度摘要，正式执行以酒店员工手册为准。配置 API Key 后可结合最新制度全文回答。）`,
    };
  }

  if (wants(["培训", "学习", "课程", "入职"])) {
    const t = getTraining();
    const overdue = (t.enrollments as any[]).filter((e) => e.status === "已逾期");
    const learning = (t.enrollments as any[]).filter((e) => e.status === "学习中");
    used.push({ tool: "get_training_status", ok: true });
    parts.push(
      `培训完成率 ${t.stats.rate}%（${t.stats.done}/${t.stats.total} 项），正在学习 ${learning.length} 项，逾期 ${overdue.length} 项。`,
    );
    if (overdue.length) {
      parts.push(
        "逾期需优先跟进：" +
          overdue
            .slice(0, 3)
            .map((e) => `${e.employee}《${e.course}》${e.due_date}`)
            .join("；"),
      );
    }
    parts.push("建议：本周内对逾期员工发一次提醒，并把必修课完成情况纳入试用期评估。");
    return { demo: true, model: "本地演示模式", tools: used, reply: parts.join("\n\n") };
  }

  if (wants(["考勤", "排班", "出勤", "迟到", "缺勤"])) {
    const s = getScheduling();
    used.push({ tool: "get_attendance_overview", ok: true });
    const abnormal = s.attendanceToday.filter((a: any) => a.status !== "正常");
    parts.push(
      `今日出勤率 ${fmtPct(s.attStats.rate)}，正常 ${s.attStats.normal} 人，迟到 ${s.attStats.late} 人，请假 ${s.attStats.leave} 人，缺勤 ${s.attStats.absent} 人。`,
    );
    if (abnormal.length) {
      parts.push(
        "异常名单：" + abnormal.slice(0, 4).map((a: any) => `${a.employee}（${a.department}·${a.status}）`).join("、"),
      );
    }
    parts.push("建议：缺勤人员当日补齐请假单，连续两日异常的交由部门主管面谈。");
    return { demo: true, model: "本地演示模式", tools: used, reply: parts.join("\n\n") };
  }

  if (wants(["绩效", "评估", "评分", "考核"])) {
    const p = getPerformance();
    used.push({ tool: "get_performance_overview", ok: true });
    parts.push(
      `${p.selected} 已评 ${p.stats.total} 人，平均 ${p.stats.avg} 分，达标率 ${p.stats.passRate}%，待面谈 ${p.stats.pending} 人。`,
    );
    parts.push("等级分布：" + p.dist.map((d) => `${d.grade} ${d.value} 人`).join(" · "));
    parts.push("建议：C 及以下员工制定 30 天改进计划，A 级员工优先纳入储备主管名单。");
    return { demo: true, model: "本地演示模式", tools: used, reply: parts.join("\n\n") };
  }

  if (wants(["招聘", "岗位", "缺口", "候选人", "面试", "offer"])) {
    const jobs = getJobs().filter((j) => j.status === "招聘中");
    const stats = getRecruitmentStats();
    const cands = getCandidates();
    used.push({ tool: "list_open_positions", ok: true });
    used.push({ tool: "get_recruitment_pipeline", ok: true });
    const gap = jobs.reduce((s, j) => s + (j.headcount - j.filled), 0);
    parts.push(
      `当前在招 ${stats.openJobs} 个职位，合计缺口 ${gap} 人；候选人 ${stats.candidates} 人，推进中 ${stats.active} 人，本周面试 ${stats.interviewsThisWeek} 场，平均招聘周期 ${stats.avgTimeToHire} 天。`,
    );
    const top = [...jobs].sort((a, b) => b.headcount - b.filled - (a.headcount - a.filled))[0];
    if (top) parts.push(`缺口最大：${top.department} · ${top.title}（缺 ${top.headcount - top.filled} 人，已挂 ${top.days_open} 天）。`);
    const stuck = cands.filter((c) => c.stage === "面试中").slice(0, 2);
    if (stuck.length) parts.push(`建议优先推进：${stuck.map((c) => `${c.name}（${c.job}）`).join("、")} 的复试安排。`);
    return { demo: true, model: "本地演示模式", tools: used, reply: parts.join("\n\n") };
  }

  const d = getDashboard();
  const k = d.kpi;
  used.push({ tool: "get_hr_overview", ok: true });
  parts.push(
    `酒店在编 ${k.headcount} 人，待招 ${k.openJobs} 个职位（缺口 ${k.openings} 人），本月入职 ${k.newHires} 人，试用期 ${k.probation} 人。`,
  );
  parts.push(
    `培训完成率 ${k.trainingRate}%，今日出勤率 ${k.attendanceRate}%，${k.performancePeriod} 绩效达标率 ${k.performancePass}%（平均 ${k.performanceAvg} 分）。`,
  );
  parts.push("你可以直接问：哪些岗位缺口最大、哪些培训逾期、写一份 JD、本月排班有什么风险。");
  return { demo: true, model: "本地演示模式", tools: used, reply: parts.join("\n\n") };
}
