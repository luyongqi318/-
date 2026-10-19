import fs from "node:fs";
import path from "node:path";

/**
 * 把构建产物复制到 release/app，服务从该目录运行。
 * 这样重新构建（写 .next）时不会碰到正在运行的进程，减少停机时间。
 */
const root = process.cwd();
const src = path.join(root, ".next", "standalone");
const dest = path.join(root, "release", "app");

if (!fs.existsSync(src)) {
  console.error("找不到 .next/standalone，请先 npm run build");
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });

const staticSrc = path.join(root, ".next", "static");
if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, path.join(dest, ".next", "static"), { recursive: true });
}
const publicSrc = path.join(root, "public");
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(dest, "public"), { recursive: true });
}

fs.rmSync(path.join(dest, "data"), { recursive: true, force: true });

console.log("release ready:", dest);
