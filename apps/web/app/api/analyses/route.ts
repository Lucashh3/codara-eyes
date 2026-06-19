import { createAnalysisRequestSchema } from "@codara-eyes/shared";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "../../../db";
import { enqueueAnalysisJob } from "../../../db/queue";
import { ensureDefaultProject } from "../../../db/projects";
import { analyses, analysisInputs } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Payload invalido." }, { status: 400 });
  }

  const parsed = createAnalysisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Payload invalido para criacao de analise.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const projectId = data.projectId ?? (await ensureDefaultProject());
  const db = getDb();

  const [analysis] = await db
    .insert(analyses)
    .values({
      projectId,
      inputType: data.inputType,
      pageType: data.pageType,
      goal: data.goal,
    })
    .returning({ id: analyses.id, status: analyses.status });

  await db.insert(analysisInputs).values({
    analysisId: analysis.id,
    url: data.url ?? null,
    uploadedFilePath: data.uploadedFilePath ?? null,
    sourceLabel: data.sourceLabel ?? null,
  });

  await enqueueAnalysisJob(analysis.id);

  return NextResponse.json({ ok: true, analysisId: analysis.id, status: analysis.status });
}

export async function GET() {
  const db = getDb();
  const rows = await db
    .select({
      id: analyses.id,
      status: analyses.status,
      inputType: analyses.inputType,
      pageType: analyses.pageType,
      goal: analyses.goal,
      error: analyses.error,
      createdAt: analyses.createdAt,
      completedAt: analyses.completedAt,
      url: analysisInputs.url,
      sourceLabel: analysisInputs.sourceLabel,
    })
    .from(analyses)
    .leftJoin(analysisInputs, eq(analysisInputs.analysisId, analyses.id))
    .orderBy(desc(analyses.createdAt))
    .limit(50);

  return NextResponse.json({ ok: true, analyses: rows });
}
