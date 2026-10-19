// 验证两件事：①任意表头文件能否被 AI 自动分类导入；②问数据能否产出图表/文件
const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];
const auth = { cookie, "content-type": "application/json" };

// 故意用不规范表头，规则匹配不到，看 AI 能不能判断
const csv = "\uFEFF人员,归属单元,岗点,到岗时间,联系方式\r\nAI员工甲,餐饮部,餐厅服务员,2026-10-01,13911112222\r\n";
const form = new FormData();
form.append("entity", "auto");
form.append("file", new Blob([csv], { type: "text/csv" }), "unknown.csv");
const started = Date.now();
const res = await fetch(`${base}/api/import`, { method: "POST", headers: { cookie }, body: form });
const data = await res.json();
console.log("auto classify:", res.status, Date.now() - started + "ms", JSON.stringify({ detected: data.detected?.label, inserted: data.inserted, error: data.error }));

// 问数据要图
const chart = await (
  await fetch(`${base}/api/agent/chat`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ messages: [{ role: "user", content: "各部门人数占比，柱状图" }] }),
  })
).json();
console.log("chart reply:", chart.demo ? "demo" : "live", "has chart:", /```chart/.test(String(chart.reply)), "len", String(chart.reply).length);

// 问数据要文件内容
const doc = await (
  await fetch(`${base}/api/agent/chat`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ messages: [{ role: "user", content: "写一份客房服务员的招聘 JD" }] }),
  })
).json();
const artifact = await (
  await fetch(`${base}/api/artifacts`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ format: "docx", title: "客房服务员招聘JD", content: String(doc.reply) }),
  })
).json();
const file = await fetch(`${base}${artifact.url}`, { headers: { cookie } });
const buf = Buffer.from(await file.arrayBuffer());
console.log("docx:", file.status, artifact.filename, buf.length, "bytes", "magic=" + buf.subarray(0, 2).toString("hex"));

// 行政台账页
for (const path of ["/admin", "/admin?tab=dorms", "/admin?tab=agency"]) {
  const r = await fetch(`${base}${path}`, { headers: { cookie } });
  const t = await r.text();
  console.log(path, r.status, t.includes("行政台账") ? "ok" : "miss");
}
