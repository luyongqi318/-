import { spawn } from "node:child_process";
import path from "node:path";

/** 从 release/app 启动服务，数据库固定指向项目根 data/，避免重建丢库。 */
const root = process.cwd();
const entry = path.join(root, "release", "app", "server.js");

const child = spawn(process.execPath, [entry], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: process.env.PORT || "3000",
    HOSTNAME: process.env.HOSTNAME || "0.0.0.0",
    HR_DB_PATH: process.env.HR_DB_PATH || path.join(root, "data", "hr.db"),
  },
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 0));
