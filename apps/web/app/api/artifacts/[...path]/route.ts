import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { resolveArtifactPath } from "../../../../lib/storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const relativePath = path.join("/");
  const absolutePath = resolveArtifactPath(relativePath);

  if (!absolutePath) {
    return NextResponse.json({ ok: false, error: "Caminho invalido." }, { status: 400 });
  }

  try {
    const data = await readFile(absolutePath);
    const ext = relativePath.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Artifact nao encontrado." }, { status: 404 });
  }
}
