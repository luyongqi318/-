const base = process.env.SHOT_BASE || "http://127.0.0.1:3000";

const anon = await fetch(`${base}/api/export?type=employees`);
console.log("anonymous export:", anon.status);

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "hr", password: "doubletree2026" }),
});
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")])[0].split(";")[0];

for (const type of ["employees", "training", "candidates", "unknown"]) {
  const res = await fetch(`${base}/api/export?type=${type}`, { headers: { cookie } });
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  console.log(
    `export ${type}: ${res.status} lines=${lines.length} header=${lines[0]?.replace(/^\uFEFF/, "").slice(0, 40) ?? "-"}`,
  );
}
