import nodemailer from "nodemailer";
import { getDb } from "./db";
import { getSetting } from "./settings";

export type MailInput = { to: string; toName?: string; subject: string; body: string; template?: string };
export type MailResult = { ok: boolean; mode: "smtp" | "outbox"; id: number; error?: string };

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
  configured: boolean;
};

export function getSmtpConfig(): SmtpConfig {
  const host = getSetting("smtp_host") || process.env.SMTP_HOST || "";
  const port = Number(getSetting("smtp_port") || process.env.SMTP_PORT || 465);
  const user = getSetting("smtp_user") || process.env.SMTP_USER || "";
  const pass = getSetting("smtp_pass") || process.env.SMTP_PASS || "";
  const from = getSetting("smtp_from") || process.env.SMTP_FROM || user;
  const secureRaw = getSetting("smtp_secure") || process.env.SMTP_SECURE || "true";
  const secure = !["0", "false", "no"].includes(secureRaw.toLowerCase());
  return { host, port, user, pass, from, secure, configured: Boolean(host && user && pass && from) };
}

function record(message: MailInput, status: string, provider: string, error?: string): number {
  const res = getDb()
    .prepare(
      `INSERT INTO messages (to_addr, to_name, subject, body, template, status, error, provider, created_at, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      message.to,
      message.toName ?? "",
      message.subject,
      message.body,
      message.template ?? "",
      status,
      error ?? null,
      provider,
      new Date().toISOString(),
      status === "已发送" ? new Date().toISOString() : null,
    );
  return Number(res.lastInsertRowid);
}

/** 配了 SMTP 就真发；没配就进发件箱，状态「待发送」，便于先跑流程。 */
export async function sendMail(message: MailInput): Promise<MailResult> {
  const config = getSmtpConfig();
  if (!config.configured) {
    const id = record(message, "待发送", "outbox", "未配置 SMTP，已存入发件箱");
    return { ok: false, mode: "outbox", id, error: "未配置邮件服务，已存入发件箱" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: 15000,
    });
    await transporter.sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.body,
    });
    const id = record(message, "已发送", "smtp");
    return { ok: true, mode: "smtp", id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "发送失败";
    const id = record(message, "失败", "smtp", reason);
    return { ok: false, mode: "smtp", id, error: reason };
  }
}

export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  const config = getSmtpConfig();
  if (!config.configured) return { ok: false, error: "请先填写 SMTP 主机、账号与密码" };
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: 15000,
    });
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "连接失败" };
  }
}

export function listMessages(limit = 100) {
  const rows = getDb().prepare("SELECT * FROM messages ORDER BY id DESC LIMIT ?").all(limit) as any[];
  return rows.map((row) => ({
    id: Number(row.id),
    to: String(row.to_addr ?? ""),
    toName: String(row.to_name ?? ""),
    subject: String(row.subject ?? ""),
    body: String(row.body ?? ""),
    template: String(row.template ?? ""),
    status: String(row.status ?? ""),
    error: row.error ? String(row.error) : null,
    provider: String(row.provider ?? ""),
    createdAt: String(row.created_at ?? ""),
    sentAt: row.sent_at ? String(row.sent_at) : null,
  }));
}

/* ---------------- 常用模板 ---------------- */

export const MAIL_TEMPLATES: Record<string, { label: string; subject: (name: string) => string; body: (name: string, extra?: string) => string }> = {
  interview: {
    label: "面试邀约",
    subject: (name) => `面试邀约 · 东锦江希尔顿逸林酒店（${name}）`,
    body: (name, extra) =>
      `${name} 您好：\n\n感谢您应聘东锦江希尔顿逸林酒店。我们想邀请您参加面试：\n\n${extra || "时间：待确认\n地点：上海市浦东新区浦东南路 2887 号 人力资源部"}\n\n请携带身份证件，提前 10 分钟到达。如时间不便，请直接回复本邮件调整。\n\n人力资源部\n东锦江希尔顿逸林酒店`,
  },
  training: {
    label: "培训提醒",
    subject: () => "培训提醒 · 东锦江希尔顿逸林酒店",
    body: (name, extra) =>
      `${name} 您好：\n\n您有一项培训任务待完成：\n${extra || "课程：待确认\n截止日期：待确认"}\n\n请在截止日期前完成学习与考核。如有班次冲突，请联系所在部门主管。\n\n人力资源部`,
  },
  approval: {
    label: "审批结果通知",
    subject: () => "审批结果通知 · 东锦江希尔顿逸林酒店",
    body: (name, extra) =>
      `${name} 您好：\n\n您提交的申请已有结果：\n${extra || ""}\n\n如对结果有疑问，请联系直属主管或人力资源部。\n\n人力资源部`,
  },
  onboarding: {
    label: "入职提醒",
    subject: () => "入职提醒 · 东锦江希尔顿逸林酒店",
    body: (name, extra) =>
      `${name} 您好：\n\n欢迎加入东锦江希尔顿逸林酒店！\n\n${extra || "报到时间：待确认\n报到地点：酒店员工通道 人力资源部"}\n\n请携带身份证、健康证与离职证明。入职当天会安排入职引导与品牌服务标准培训。\n\n人力资源部`,
  },
};
