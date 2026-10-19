import http from "node:http";

/**
 * 用一个本地假模型服务验证「真实模型链路」：
 * 设置页保存 Key/BaseURL → agent 发起请求 → 模型返回 tool_call → 执行真实查库工具
 * → 工具结果回传 → 模型给出最终回答。
 */
const APP = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const MOCK_PORT = 4100;

const seen = [];
const mock = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const payload = JSON.parse(body || "{}");
    seen.push(payload.messages?.map((m) => m.role).join("→"));
    const hasToolResult = (payload.messages ?? []).some((m) => m.role === "tool");
    res.setHeader("content-type", "application/json");
    if (!hasToolResult) {
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: "",
                tool_calls: [
                  {
                    id: "call_overview",
                    type: "function",
                    function: { name: "get_hr_overview", arguments: "{}" },
                  },
                ],
              },
            },
          ],
          usage: { prompt_tokens: 120, completion_tokens: 20 },
        }),
      );
    } else {
      const toolMessage = payload.messages.filter((m) => m.role === "tool").pop();
      const headcount = JSON.parse(toolMessage?.content ?? "{}")?.headcount ?? "?";
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: `（模拟模型）我查了系统：当前在编 ${headcount} 人，招聘与培训数据正常。`,
              },
            },
          ],
          usage: { prompt_tokens: 260, completion_tokens: 40 },
        }),
      );
    }
  });
});

await new Promise((resolve) => mock.listen(MOCK_PORT, "127.0.0.1", resolve));
console.log("mock model listening on", MOCK_PORT);

const login = await fetch(`${APP}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];
const jsonHeaders = { cookie, "content-type": "application/json" };

const saved = await (
  await fetch(`${APP}/api/settings/agent`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ apiKey: "sk-mock-1234567890", baseUrl: `http://127.0.0.1:${MOCK_PORT}`, model: "mock-model" }),
  })
).json();
console.log("settings saved:", saved.configured, saved.masked, saved.source, saved.model);

const chat = await fetch(`${APP}/api/agent/chat`, {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify({ messages: [{ role: "user", content: "现在人力情况怎么样？" }] }),
});
const chatJson = await chat.json();
console.log("chat status:", chat.status, "demo?", chatJson.demo, "model:", chatJson.model);
console.log("tools:", (chatJson.tools ?? []).map((t) => `${t.tool}:${t.ok}`).join(","));
console.log("reply:", String(chatJson.reply ?? "").slice(0, 80));
console.log("mock saw message flows:", seen.join(" | "));

await fetch(`${APP}/api/settings/agent`, {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify({ clearKey: true, baseUrl: "https://api.deepseek.com", model: "deepseek-chat" }),
});
console.log("settings cleared");

mock.close();
