# 东锦江希尔顿逸林酒店 · 人力资源平台

一个面向酒店 HR 的一体化工作台：招聘、培训与入职、员工档案、排班考勤、绩效评估，加上一个能直接读取业务数据的 AI 智能体。数据落在本地 SQLite，开箱即用。

> 演示数据均为虚构，用于展示产品形态。真实上线前请替换为酒店实际数据并修改登录账号。

## 功能

| 模块 | 能力 |
| --- | --- |
| 数据看板 | 在编人数、待招缺口、本月入职、培训完成率、今日出勤率、绩效达标率；部门人数、招聘漏斗、入职趋势、待办提醒 |
| 招聘管理 | 职位需求、候选人看板（5 个阶段）、面试安排、新建职位、候选人阶段流转 |
| 培训与入职 | 课程目录、学习任务进度、逾期跟进、必修清单、分配培训 |
| 员工档案 | 花名册检索/筛选/分页、员工详情（培训、绩效、出勤、排班） |
| 排班与考勤 | 周排班表（早/中/晚/休）、部门筛选、今日考勤明细与出勤率 |
| 绩效评估 | 周期切换、等级分布、部门平均分、待面谈名单、评估明细 |
| AI 智能体 | 读取招聘/培训/员工/排班/绩效数据回答问题，生成 JD、面试提纲、培训计划；也可回答酒店 HR 制度问题 |
| 系统设置 | 在网页里直接填写并测试模型 API Key（存本地数据库，立即生效，无需重启） |

## 技术栈

- Next.js 15（App Router）+ React 19 + TypeScript
- Node 24 内置 `node:sqlite`，零原生依赖，单文件数据库
- 纯手写 CSS 设计系统（暖象牙 / 墨蓝 / 香槟金），无 UI 框架
- 登录鉴权：HMAC 签名 Cookie（HttpOnly）
- 智能体：DeepSeek（OpenAI 兼容协议）+ Function Calling，未配 Key 时自动进入本地演示模式

## 本地运行

```bash
npm install
npm run dev          # http://localhost:3000
```

生产模式：

```bash
npm run build
npm start
```

演示账号：`hr` / `doubletree2026`（可用 `HR_USER`、`HR_PASS` 覆盖）

首次启动会在 `data/hr.db` 自动建表并写入演示数据；删除 `data/` 目录后重启即可重置。

## 配置

复制 `.env.example` 为 `.env.local`：

```ini
DEEPSEEK_API_KEY=sk-xxxx          # 留空则智能体走本地演示模式
AGENT_MODEL=deepseek-chat
AGENT_BASE_URL=https://api.deepseek.com

HR_USER=hr
HR_PASS=doubletree2026
AUTH_SECRET=请替换为足够长的随机串
```

兼容任意 OpenAI 协议的网关（通义、智谱、Kimi、自建代理），只需修改 `AGENT_BASE_URL` 与 `AGENT_MODEL`。

### 在网页里配置 Key（推荐）

登录后进入 **系统设置**，直接粘贴 API Key、Base URL 与模型名，点「保存配置」立即生效；点「测试连接」可以验证 Key 是否可用。Key 保存在服务器本地数据库，不会下发到浏览器。

### 健康检查

`GET /api/health` 返回数据库状态、在编人数与智能体配置状态，可用于托管平台探活与线上巡检。

### 智能体能力

未配置 Key 时走**本地演示模式**，用真实业务数据生成确定性回答，便于验收：

| 类型 | 例子 | 用到的数据 |
| --- | --- | --- |
| 数据问答 | 哪个岗位缺口最大？谁培训逾期？今天出勤率？ | 招聘漏斗、培训任务、考勤、绩效、编制 |
| 成稿 | 招聘 JD、结构化面试提纲、30 天新员工培训方案 | 在招职位、课程表、部门完成率 |
| 制度问答 | 试用期多久转正？年假怎么算？离职流程？ | 内置 HR 制度摘要 |

配置 Key 后由大模型自由组织语言，并可通过 Function Calling 继续查数；演示模式只覆盖上述固定场景。

## 部署

### Railway（推荐）

仓库已初始化 git 并附带 `.github/workflows/ci.yml`，可直接推送到 GitHub：

```bash
git remote add origin <你的仓库地址>
git push -u origin main
```

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

部署后：

1. 在服务里添加 Volume，挂载路径 `/app/data`（保存 SQLite）。
2. 设置环境变量：`DEEPSEEK_API_KEY`、`HR_USER`、`HR_PASS`、`AUTH_SECRET`。
3. Railway 会自动读取 `railway.json` 的健康检查 `/api/health`。

### Render

把仓库推到 GitHub 后，在 Render 选择 **New → Blueprint**，导入 `render.yaml`；按提示填写 `DEEPSEEK_API_KEY` 等变量即可（磁盘已配置为 `/app/data`）。

### 临时公网预览（无需账号）

本地演示想给别人看时，可以用 Cloudflare 快速隧道拿一个临时公网地址：

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

输出里的 `https://xxx.trycloudflare.com` 即可访问。进程停止后地址失效，仅适合演示，不建议长期使用。

### Vercel

可以构建，但 Vercel 的 Serverless 文件系统不可持久化，SQLite 无法保存数据。若必须用 Vercel，请把数据层换成 Postgres（Neon / Supabase）。

## 目录结构

```
src/
  app/
    (app)/          登录后的工作台（布局、看板、各模块、智能体页）
    login/          登录页
    api/            auth / recruitment / training / agent 接口
  components/       导航、图表、弹窗、智能体对话等
  lib/
    db.ts           node:sqlite 连接与建表
    seed.ts         演示数据（确定性随机）
    queries.ts      各模块查询与聚合
    agent.ts        DeepSeek 工具调用与本地演示回答
    auth.ts         会话签名
public/favicon.svg
data/              运行时数据库（已 gitignore）
```

## 安全说明

- 所有页面与写入接口都校验会话，未登录会跳转 `/login`。
- 智能体只读取聚合与业务字段，不包含身份证号、银行卡等敏感信息。
- 生产环境请务必修改默认账号、设置 `AUTH_SECRET`，并只在内网或受控域名下使用。
