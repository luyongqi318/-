import { getDb } from "./db";

export type ChatMessageRow = { id: number; role: string; content: string; tools: string; createdAt: string };

export function saveChat(role: "user" | "assistant", content: string, tools?: unknown): void {
  try {
    getDb()
      .prepare("INSERT INTO chat_messages (role, content, tools, created_at) VALUES (?, ?, ?, ?)")
      .run(role, String(content).slice(0, 20000), tools ? JSON.stringify(tools) : "", new Date().toISOString());
  } catch {
    /* 记录失败不影响对话 */
  }
}

export function listChat(limit = 60): ChatMessageRow[] {
  const rows = getDb().prepare("SELECT * FROM chat_messages ORDER BY id DESC LIMIT ?").all(limit) as any[];
  return rows
    .map((row) => ({
      id: Number(row.id),
      role: String(row.role ?? ""),
      content: String(row.content ?? ""),
      tools: String(row.tools ?? ""),
      createdAt: String(row.created_at ?? ""),
    }))
    .reverse();
}

export function clearChat(): void {
  getDb().prepare("DELETE FROM chat_messages").run();
}
