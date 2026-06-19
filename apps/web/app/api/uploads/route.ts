import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { getArtifactsDir } from "../../../lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Arquivo ausente." }, { status: 400 });
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ ok: false, error: "Formato nao suportado. Envie PNG ou JPG." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Arquivo maior que 10 MB." }, { status: 413 });
  }

  const id = crypto.randomUUID();
  const safeName = (file.name || `upload.${ext}`).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const relativePath = `uploads/${id}/${safeName}`;
  const absoluteDir = join(getArtifactsDir(), "uploads", id);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(join(absoluteDir, safeName), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    ok: true,
    path: relativePath,
    url: `/api/artifacts/${relativePath}`,
    name: file.name,
  });
}
