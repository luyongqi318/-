import { getDb } from "./db";
import { todayIso } from "./queries";

export type KnowledgeItem = { id: number; title: string; content: string; created_at: string };

export function listKnowledge(): Omit<KnowledgeItem, "content">[] {
  const rows = getDb()
    .prepare("SELECT id, title, created_at, LENGTH(content) AS size FROM knowledge ORDER BY id DESC")
    .all() as any[];
  // node:sqlite 返回的是 null 原型对象，传给客户端组件前必须转成普通对象
  return rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title ?? ""),
    created_at: String(row.created_at ?? ""),
    size: Number(row.size ?? 0),
  }));
}

export function getKnowledge(id: number): KnowledgeItem | undefined {
  return getDb().prepare("SELECT * FROM knowledge WHERE id = ?").get(id) as KnowledgeItem | undefined;
}

export function addKnowledge(title: string, content: string): number {
  const res = getDb()
    .prepare("INSERT INTO knowledge (title, content, created_at) VALUES (?, ?, ?)")
    .run(title.trim(), content.trim(), todayIso());
  return Number(res.lastInsertRowid);
}

export function deleteKnowledge(id: number): void {
  getDb().prepare("DELETE FROM knowledge WHERE id = ?").run(id);
}

/** 演示模式下按问题与资料的字符重合度做轻量检索，命中则直接引用原文。 */
export function findKnowledge(question: string): { title: string; content: string } | null {
  try {
    const items = getDb().prepare("SELECT title, content FROM knowledge ORDER BY id DESC LIMIT 20").all() as {
      title: string;
      content: string;
    }[];
    const q = question.trim();
    if (!items.length || q.length < 4) return null;
    const shingles = new Set<string>();
    for (let i = 0; i < q.length - 1; i += 1) {
      const s = q.slice(i, i + 2).trim();
      if (s.length === 2) shingles.add(s);
    }
    let best: { title: string; content: string } | null = null;
    let bestTitleHits = 0;
    let bestContentHits = 0;
    for (const item of items) {
      let titleHits = 0;
      let contentHits = 0;
      for (const s of shingles) {
        if (item.title.includes(s)) titleHits += 1;
        if (item.content.includes(s)) contentHits += 1;
      }
      const strong = titleHits >= 2 || (titleHits >= 1 && contentHits >= 2) || contentHits >= 4;
      if (strong && titleHits * 2 + contentHits > bestTitleHits * 2 + bestContentHits) {
        best = item;
        bestTitleHits = titleHits;
        bestContentHits = contentHits;
      }
    }
    return best;
  } catch {
    return null;
  }
}

/** 把知识库拼进智能体的系统提示，控制总长度避免挤占上下文。 */
export function knowledgePrompt(maxItems = 4, maxChars = 5000): string {
  try {
    const rows = getDb()
      .prepare("SELECT title, content FROM knowledge ORDER BY id DESC LIMIT ?")
      .all(maxItems) as { title: string; content: string }[];
    if (!rows.length) return "";
    let budget = maxChars;
    const chunks: string[] = [];
    for (const row of rows) {
      const text = row.content.slice(0, Math.max(0, Math.min(budget, 1600)));
      if (!text) break;
      chunks.push(`【${row.title}】\n${text}`);
      budget -= text.length;
      if (budget <= 0) break;
    }
    return chunks.join("\n\n");
  } catch {
    return "";
  }
}
