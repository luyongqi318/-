const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];
const auth = { cookie, "content-type": "application/json" };

const health = await (await fetch(`${base}/api/health`)).json();
console.log("health before:", health.status, health.headcount);

// 1. 生成 PPT（含长文）
const content = `# 2026 年第四季度人力资源工作汇报

## 一、人员概况
- 在编员工 130 人，覆盖 9 个部门
- 客房部 34 人，占比最高
- 试用期 16 人，本月入职 7 人

## 二、招聘进展
- 在招 9 个职位，缺口 20 人
- 平均招聘周期 20 天
- 本周面试 6 场

## 三、培训与合规
- 培训完成率 53%，逾期 53 项
- 健康证到期需跟进 5 人
- 新员工 30 天内完成入职引导

## 四、下一步
- 补齐客房与餐饮一线缺口
- 把培训逾期压到 10 项以内
- 上线主管面谈机制`;

const ppt = await (
  await fetch(`${base}/api/artifacts`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ format: "pptx", title: "Q4 人力资源工作汇报", content }),
  })
).json();
if (ppt.url) {
  const file = await fetch(`${base}${ppt.url}`, { headers: { cookie } });
  const buf = Buffer.from(await file.arrayBuffer());
  console.log("pptx:", file.status, ppt.filename, buf.length, "bytes", "magic=" + buf.subarray(0, 2).toString("hex"));
}

// 2. 清空业务数据
const reset = await (
  await fetch(`${base}/api/admin/reset`, { method: "POST", headers: auth, body: JSON.stringify({ confirm: "清空" }) })
).json();
console.log("reset:", JSON.stringify(reset).slice(0, 220));

const after = await (await fetch(`${base}/api/health`)).json();
console.log("health after:", after.status, after.headcount);
