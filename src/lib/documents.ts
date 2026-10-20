import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import PptxGenJS from "pptxgenjs";
import * as XLSX from "xlsx";

export type ArtifactFormat = "docx" | "xlsx" | "csv" | "md" | "txt" | "pptx";

export const FORMAT_META: Record<ArtifactFormat, { ext: string; mime: string; label: string }> = {
  docx: { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word" },
  xlsx: { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel" },
  pptx: { ext: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "PPT" },
  csv: { ext: "csv", mime: "text/csv; charset=utf-8", label: "CSV" },
  md: { ext: "md", mime: "text/markdown; charset=utf-8", label: "Markdown" },
  txt: { ext: "txt", mime: "text/plain; charset=utf-8", label: "文本" },
};

const ARTIFACT_DIR = path.join(process.cwd(), "data", "artifacts");

export function isFormat(value: string): value is ArtifactFormat {
  return Object.prototype.hasOwnProperty.call(FORMAT_META, value);
}

function safeTitle(title: string): string {
  return (title || "未命名文档").replace(/[\\/:*?"<>|\r\n]/g, "").slice(0, 60).trim() || "未命名文档";
}

/** 把简单 Markdown 转成段落：支持 # 标题、- 列表、空行。 */
function mdToParagraphs(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const raw of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ children: [], spacing: { after: 120 } }));
      continue;
    }
    if (/^###\s+/.test(line)) {
      paragraphs.push(new Paragraph({ text: line.replace(/^###\s+/, ""), heading: HeadingLevel.HEADING_3 }));
    } else if (/^##\s+/.test(line)) {
      paragraphs.push(new Paragraph({ text: line.replace(/^##\s+/, ""), heading: HeadingLevel.HEADING_2 }));
    } else if (/^#\s+/.test(line)) {
      paragraphs.push(new Paragraph({ text: line.replace(/^#\s+/, ""), heading: HeadingLevel.HEADING_1 }));
    } else if (/^[-*]\s+/.test(line)) {
      paragraphs.push(new Paragraph({ text: line.replace(/^[-*]\s+/, ""), bullet: { level: 0 } }));
    } else if (/^\d+[.)]\s+/.test(line)) {
      paragraphs.push(new Paragraph({ text: line.replace(/^\d+[.)]\s+/, "") }));
    } else {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: line, size: 22 })], spacing: { after: 80 } }));
    }
  }
  return paragraphs;
}

async function buildDocx(title: string, content: string): Promise<Buffer> {
  const doc = new Document({
    creator: "东锦江希尔顿逸林酒店 HR",
    title,
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 36 })],
            alignment: AlignmentType.LEFT,
            spacing: { after: 240 },
          }),
          ...mdToParagraphs(content),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

function parseMarkdownTable(content: string): string[][] | null {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return null;
  const rows = lines
    .filter((l) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(l))
    .map((l) =>
      l
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim()),
    );
  return rows.length >= 2 ? rows : null;
}

function buildXlsx(content: string): Buffer {
  const table = parseMarkdownTable(content);
  const rows: (string | number)[][] = table ?? content.split(/\r?\n/).map((line, i) => [i + 1, line]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = Array.from({ length: rows[0]?.length ?? 1 }, () => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "内容");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function stripBullet(line: string): string {
  return line.replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, "").trim();
}

async function buildPptx(title: string, content: string): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  const chunks = content.split(/\n(?=#{1,3}\s)/);
  const introLines = chunks[0]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map(stripBullet);

  const cover = pptx.addSlide();
  cover.background = { color: "0F2130" };
  cover.addText(title.slice(0, 60), { x: 0.7, y: 1.9, w: 8.6, h: 1.2, fontSize: 34, bold: true, color: "F7F2E7", fontFace: "Microsoft YaHei" });
  cover.addShape(pptx.ShapeType.rect, { x: 0.75, y: 3.15, w: 1.4, h: 0.06, fill: { color: "C9A869" } });
  cover.addText(introLines.slice(0, 2).join(" ").slice(0, 120) || "东锦江希尔顿逸林酒店 · 人力资源部", {
    x: 0.75,
    y: 3.45,
    w: 8.2,
    h: 0.9,
    fontSize: 15,
    color: "C9D3DD",
    fontFace: "Microsoft YaHei",
  });

  const slides = chunks.slice(1).map((chunk) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const head = lines[0] ?? "";
    return {
      title: head.replace(/^#{1,3}\s*/, "").slice(0, 50) || "内容",
      bullets: lines.slice(1).map(stripBullet).filter(Boolean).slice(0, 8),
    };
  });

  if (slides.length === 0) {
    const all = introLines.filter(Boolean);
    for (let i = 0; i < all.length; i += 6) {
      slides.push({ title: i === 0 ? "要点" : `要点（${i / 6 + 1}）`, bullets: all.slice(i, i + 6) });
    }
  }

  for (const item of slides.slice(0, 12)) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFDFA" };
    slide.addText(item.title, { x: 0.7, y: 0.5, w: 8.6, h: 0.8, fontSize: 26, bold: true, color: "1B242C", fontFace: "Microsoft YaHei" });
    slide.addShape(pptx.ShapeType.rect, { x: 0.75, y: 1.28, w: 1.2, h: 0.05, fill: { color: "C9A869" } });
    if (item.bullets.length) {
      slide.addText(
        item.bullets.map((text) => ({
          text: text.slice(0, 120),
          options: { bullet: true, fontSize: 16, color: "3D4F66", breakLine: true, paraSpaceAfter: 8, fontFace: "Microsoft YaHei" },
        })),
        { x: 0.9, y: 1.65, w: 8.2, h: 4.6, valign: "top" },
      );
    }
    slide.addText("东锦江希尔顿逸林酒店 · HR", { x: 0.75, y: 6.85, w: 4, h: 0.3, fontSize: 9, color: "9AA6B2" });
  }

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

function buildCsv(content: string): Buffer {  const table = parseMarkdownTable(content);
  const escape = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const text = table
    ? table.map((row) => row.map(escape).join(",")).join("\r\n")
    : content
        .split(/\r?\n/)
        .map((line) => escape(line))
        .join("\r\n");
  return Buffer.from(`\uFEFF${text}\r\n`, "utf8");
}

/** 生成文件并落盘，返回可直接下载的 id。 */
export async function createArtifact(
  format: ArtifactFormat,
  title: string,
  content: string,
): Promise<{ id: string; filename: string; size: number }> {
  const meta = FORMAT_META[format];
  const name = safeTitle(title);
  let buffer: Buffer;

  if (format === "docx") buffer = await buildDocx(name, content);
  else if (format === "xlsx") buffer = buildXlsx(content);
  else if (format === "pptx") buffer = await buildPptx(name, content);
  else if (format === "csv") buffer = buildCsv(content);
  else if (format === "md") buffer = Buffer.from(`# ${name}\n\n${content}\n`, "utf8");
  else buffer = Buffer.from(`${name}\n\n${content}\n`, "utf8");

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const id = crypto.randomBytes(12).toString("hex");
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${id}.${meta.ext}`), buffer);
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, `${id}.json`),
    JSON.stringify({ id, title: name, format, ext: meta.ext, mime: meta.mime, size: buffer.length, createdAt: Date.now() }),
    "utf8",
  );

  return { id, filename: `${name}.${meta.ext}`, size: buffer.length };
}

export function readArtifact(id: string): { buffer: Buffer; filename: string; mime: string } | null {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, `${id}.json`), "utf8")) as {
      title: string;
      ext: string;
      mime: string;
    };
    const buffer = fs.readFileSync(path.join(ARTIFACT_DIR, `${id}.${meta.ext}`));
    return { buffer, filename: `${meta.title}.${meta.ext}`, mime: meta.mime };
  } catch {
    return null;
  }
}
