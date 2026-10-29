import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const srcDir = "public/bg";
const fullDir = "public/bg/full";
const softDir = "public/bg/soft";
fs.mkdirSync(fullDir, { recursive: true });
fs.mkdirSync(softDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
const report = [];

for (const file of files) {
  const name = path.parse(file).name;
  const input = path.join(srcDir, file);

  const full = path.join(fullDir, `${name}.webp`);
  await sharp(input).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 72 }).toFile(full);

  // 内部页面用的「磨砂底」：先缩小再模糊，体积小、GPU 压力几乎为零
  const soft = path.join(softDir, `${name}.webp`);
  await sharp(input).resize({ width: 640 }).blur(12).modulate({ brightness: 1.06 }).webp({ quality: 58 }).toFile(soft);

  report.push({
    name,
    original: Math.round(fs.statSync(input).size / 1024) + "KB",
    full: Math.round(fs.statSync(full).size / 1024) + "KB",
    soft: Math.round(fs.statSync(soft).size / 1024) + "KB",
  });
}

console.log(JSON.stringify(report, null, 1));
