import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "../../../db";
import {
  analyses,
  analysisInputs,
  artifacts,
  comparisons,
  uxScores,
  viewports,
} from "../../../db/schema";
import { buildSummary, computeDeltas, type Scores } from "../../../lib/comparison";

export const dynamic = "force-dynamic";

type AnalysisCompareData = {
  id: string;
  projectId: string;
  title: string;
  status: string;
  scores: Scores | null;
  heatmapUrl: string | null;
};

async function getCompareData(id: string): Promise<AnalysisCompareData | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: analyses.id,
      projectId: analyses.projectId,
      status: analyses.status,
      url: analysisInputs.url,
      sourceLabel: analysisInputs.sourceLabel,
    })
    .from(analyses)
    .leftJoin(analysisInputs, eq(analysisInputs.analysisId, analyses.id))
    .where(eq(analyses.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [viewportRows, scoreRows, artifactRows] = await Promise.all([
    db.select().from(viewports).where(eq(viewports.analysisId, id)),
    db.select().from(uxScores).where(eq(uxScores.analysisId, id)),
    db.select().from(artifacts).where(eq(artifacts.analysisId, id)),
  ]);

  const primary = viewportRows.find((vp) => vp.type === "desktop") ?? viewportRows[0];
  const scoreRow = primary ? scoreRows.find((s) => s.viewportId === primary.id) : undefined;
  const heatmap = primary
    ? artifactRows.find((a) => a.viewportId === primary.id && a.artifactType === "heatmap")
    : undefined;

  return {
    id: row.id,
    projectId: row.projectId,
    title: row.sourceLabel || row.url || "Upload de imagem",
    status: row.status,
    scores: scoreRow
      ? {
          ctaVisibility: scoreRow.ctaVisibility,
          headlineAttention: scoreRow.headlineAttention,
          visualHierarchy: scoreRow.visualHierarchy,
          attentionCompetition: scoreRow.attentionCompetition,
          aboveTheFoldEfficiency: scoreRow.aboveTheFoldEfficiency,
          clutterScore: scoreRow.clutterScore,
        }
      : null,
    heatmapUrl: heatmap ? `/api/artifacts/${heatmap.storagePath}` : null,
  };
}

export async function POST(request: Request) {
  let body: { baseAnalysisId?: string; targetAnalysisId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Payload invalido." }, { status: 400 });
  }

  const { baseAnalysisId, targetAnalysisId } = body;
  if (!baseAnalysisId || !targetAnalysisId) {
    return NextResponse.json({ ok: false, error: "Selecione as duas analises." }, { status: 400 });
  }
  if (baseAnalysisId === targetAnalysisId) {
    return NextResponse.json({ ok: false, error: "Escolha analises diferentes." }, { status: 400 });
  }

  const [base, target] = await Promise.all([
    getCompareData(baseAnalysisId),
    getCompareData(targetAnalysisId),
  ]);

  if (!base || !target) {
    return NextResponse.json({ ok: false, error: "Analise nao encontrada." }, { status: 404 });
  }
  if (!base.scores || !target.scores) {
    return NextResponse.json(
      { ok: false, error: "Ambas as analises precisam estar concluidas." },
      { status: 400 },
    );
  }

  const deltas = computeDeltas(base.scores, target.scores);
  const summary = buildSummary(deltas);

  const db = getDb();
  const [comparison] = await db
    .insert(comparisons)
    .values({
      projectId: base.projectId,
      baseAnalysisId: base.id,
      targetAnalysisId: target.id,
      summary,
      deltaScores: deltas,
    })
    .returning({ id: comparisons.id });

  return NextResponse.json({
    ok: true,
    id: comparison.id,
    summary,
    deltas,
    base: { id: base.id, title: base.title, scores: base.scores, heatmapUrl: base.heatmapUrl },
    target: {
      id: target.id,
      title: target.title,
      scores: target.scores,
      heatmapUrl: target.heatmapUrl,
    },
  });
}
