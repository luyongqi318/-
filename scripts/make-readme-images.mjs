import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const outDir = "docs/images";
fs.mkdirSync(outDir, { recursive: true });

const jobs = [
  ["shots/43-demo-dashboard.png", "dashboard.webp", 1400],
  ["shots/48-org.png", "org.webp", 1200],
  ["shots/46-login-bg.png", "login.webp", 1200],
  ["shots/49-search.png", "search.webp", 1200],
];

for (const [src, name, width] of jobs) {
  if (!fs.existsSync(src)) {
    console.log("skip", src);
    continue;
  }
  const target = path.join(outDir, name);
  await sharp(src).resize({ width }).webp({ quality: 74 }).toFile(target);
  console.log(name, Math.round(fs.statSync(target).size / 1024) + "KB");
}
