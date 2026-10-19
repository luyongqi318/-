import { NextResponse } from "next/server";
import { approvalStats, APPROVAL_TYPES, createApproval, decideApproval, listApprovals } from "@/lib/approvals";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  return NextResponse.json({ items: listApprovals(), stats: approvalStats() });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const type = String(body.type ?? "");
  const title = String(body.title ?? "").trim();
  const detail = String(body.detail ?? "").trim();
  const requester = String(body.requester ?? "").trim() || session.u;

  if (!APPROVAL_TYPES.includes(type as any)) return NextResponse.json({ error: "审批类型不合法" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "请填写标题" }, { status: 400 });
  if (detail.length < 4) return NextResponse.json({ error: "请填写事由，至少 4 个字" }, { status: 400 });

  const id = createApproval({
    type,
    requester,
    employeeId: body.employeeId ? Number(body.employeeId) : null,
    title,
    detail,
    startDate: String(body.startDate ?? ""),
    endDate: String(body.endDate ?? ""),
    amount: body.amount === undefined || body.amount === "" ? null : Number(body.amount),
  });

  logAudit("提交审批", `${type}：${title}`, session.u, clientIp(req));

  // 通知审批人（未配置 SMTP 时自动进发件箱）
  const mail = await sendMail({
    to: process.env.HR_APPROVER_EMAIL || "hr@doubletree-pudong.com",
    toName: "人力资源部",
    subject: `待审批：${type} · ${title}`,
    body: `${requester} 提交了一条${type}申请：\n\n${title}\n${detail}\n\n请登录 HR 平台审批。`,
    template: "approval",
  });

  return NextResponse.json({ ok: true, id, mail: { ok: mail.ok, mode: mail.mode, error: mail.error } });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const id = Number(body.id);
  const decision = String(body.decision ?? "");
  if (!Number.isFinite(id)) return NextResponse.json({ error: "参数不正确" }, { status: 400 });
  if (decision !== "已通过" && decision !== "已驳回") return NextResponse.json({ error: "审批结果不合法" }, { status: 400 });

  const updated = decideApproval(id, decision, session.u, String(body.comment ?? ""));
  if (!updated) return NextResponse.json({ error: "审批单不存在" }, { status: 404 });

  logAudit("审批处理", `${updated.type}：${updated.title} → ${decision}`, session.u, clientIp(req));

  await sendMail({
    to: process.env.HR_NOTIFY_EMAIL || "hr@doubletree-pudong.com",
    toName: updated.requester,
    subject: `审批结果：${updated.title} · ${decision}`,
    body: `${updated.requester} 您好：\n\n您提交的${updated.type}申请「${updated.title}」${decision}。\n审批人：${session.u}\n意见：${updated.comment || "无"}\n`,
    template: "approval",
  });

  return NextResponse.json({ ok: true, item: updated });
}
