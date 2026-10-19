import { getSession } from "@/lib/auth";
import { readArtifact } from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("请先登录", { status: 401 });

  const { id } = await params;
  const artifact = readArtifact(id);
  if (!artifact) return new Response("文件不存在或已过期", { status: 404 });

  const asciiName = `${id}.${artifact.filename.split(".").pop() ?? "bin"}`;
  return new Response(new Uint8Array(artifact.buffer), {
    headers: {
      "Content-Type": artifact.mime,
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(artifact.filename)}`,
      "Content-Length": String(artifact.buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
