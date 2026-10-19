const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];
const auth = { cookie, "content-type": "application/json" };

const content = `【前厅部 · 前台接待】招聘 JD

岗位职责：
1. 按希尔顿品牌服务标准完成入住、退房与问询接待
2. 处理宾客需求与投诉，必要时升级至值班经理

任职要求：
1. 高中及以上学历，酒店或高端服务业经验优先
2. 普通话流利，具备基础英语沟通能力

薪资：6000–7800 元/月`;

for (const format of ["docx", "xlsx", "md", "txt", "csv"]) {
  const res = await fetch(`${base}/api/artifacts`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ format, title: "前台接待招聘JD", content }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.log(format, "FAIL", data.error);
    continue;
  }
  const file = await fetch(`${base}${data.url}`, { headers: { cookie } });
  const buf = Buffer.from(await file.arrayBuffer());
  const magic = buf.subarray(0, 2).toString("hex");
  console.log(format, "->", file.status, data.filename, buf.length, "bytes", "magic=" + magic);
}

// 自动识别导入：表头故意用别名
const cases = [
  {
    name: "员工（别名表头）",
    csv: "员工姓名,所属部门,岗位,入职时间,联系电话\r\n自动甲,餐饮部,餐厅服务员,2026-09-01,13900000001\r\n",
  },
  {
    name: "课程（别名表头）",
    csv: "培训课程,课程分类,时长,必修\r\n自动课程A,服务标准,45,是\r\n",
  },
  {
    name: "候选人（别名表头）",
    csv: "候选人姓名,应聘岗位,渠道,当前阶段\r\n自动乙,礼宾员,内部推荐,面试中\r\n",
  },
];

for (const item of cases) {
  const form = new FormData();
  form.append("entity", "auto");
  form.append("file", new Blob(["\uFEFF" + item.csv], { type: "text/csv" }), "auto.csv");
  const res = await fetch(`${base}/api/import`, { method: "POST", headers: { cookie }, body: form });
  const data = await res.json();
  console.log(item.name, "->", res.status, data.detected?.label ?? data.error, "inserted=" + data.inserted);
}
