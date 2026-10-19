import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import * as XLSX from "xlsx";

export type ArtifactFormat = "docx" | "xlsx" | "csv" | "md" | "txt";

export const FORMAT_META: Record<ArtifactFormat, { ext: string; mime: string; label: string }> = {
  docx: { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word" },
  xlsx: { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel" },
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

function buildCsv(content: string): Buffer {
  const table = parseMarkdownTable(content);
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
