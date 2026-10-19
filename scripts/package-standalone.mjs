import fs from "node:fs";
import path from "node:path";

/** 把 static 与 public 复制进 standalone 目录，让 `node .next/standalone/server.js` 可直接运行。 */
const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.log("standalone output not found, skip packaging");
  process.exit(0);
}

const staticSrc = path.join(root, ".next", "static");
if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, path.join(standalone, ".next", "static"), { recursive: true });
}

const publicSrc = path.join(root, "public");
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(standalone, "public"), { recursive: true });
}

console.log("standalone packaged: static + public");
