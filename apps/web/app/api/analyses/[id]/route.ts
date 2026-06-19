import { and, asc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "../../../../db";
import {
  aiReports,
  analyses,
  analysisInputs,
  artifacts,
  attentionSummaries,
  detectedElements,
  uxScores,
  viewports,
} from "../../../../db/schema";

export const dynamic = "force-dynamic";

const SOURCE_TYPES = new Set(["source_screenshot", "source_upload"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const analysisRows = await db
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
    .where(eq(analyses.id, id))
    .limit(1);

  if (!analysisRows[0]) {
    return NextResponse.json({ ok: false, error: "Analise nao encontrada." }, { status: 404 });
  }

  const [viewportRows, scoreRows, elementRows, attentionRows, artifactRows, reportRows] =
    await Promise.all([
      db.select().from(viewports).where(eq(viewports.analysisId, id)).orderBy(asc(viewports.type)),
      db.select().from(uxScores).where(eq(uxScores.analysisId, id)),
      db
        .select()
        .from(detectedElements)
        .where(eq(detectedElements.analysisId, id))
        .orderBy(asc(detectedElements.bboxY)),
      db.select().from(attentionSummaries).where(eq(attentionSummaries.analysisId, id)),
      db.select().from(artifacts).where(eq(artifacts.analysisId, id)),
      db
        .select()
        .from(aiReports)
        .where(and(eq(aiReports.analysisId, id), isNull(aiReports.viewportId)))
        .orderBy(asc(aiReports.createdAt))
        .limit(1),
    ]);

  const scoreByViewport = new Map(scoreRows.map((row) => [row.viewportId, row]));
  const attentionByViewport = new Map(attentionRows.map((row) => [row.viewportId, row]));

  const result = viewportRows.map((viewport) => {
    const scores = scoreByViewport.get(viewport.id);
    const attention = attentionByViewport.get(viewport.id);

    const viewportArtifacts: Record<string, string> = {};
    for (const artifact of artifactRows) {
      if (artifact.viewportId !== viewport.id) continue;
      const key = SOURCE_TYPES.has(artifact.artifactType) ? "source" : artifact.artifactType;
      viewportArtifacts[key] = `/api/artifacts/${artifact.storagePath}`;
    }

    return {
      id: viewport.id,
      type: viewport.type,
      width: viewport.width,
      height: viewport.height,
      scores: scores
        ? {
            ctaVisibility: scores.ctaVisibility,
            headlineAttention: scores.headlineAttention,
            visualHierarchy: scores.visualHierarchy,
            attentionCompetition: scores.attentionCompetition,
            aboveTheFoldEfficiency: scores.aboveTheFoldEfficiency,
            clutterScore: scores.clutterScore,
          }
        : null,
      elements: elementRows
        .filter((element) => element.viewportId === viewport.id)
        .map((element) => ({
          elementType: element.elementType,
          label: element.label,
          bbox: { x: element.bboxX, y: element.bboxY, w: element.bboxW, h: element.bboxH },
          aboveFold: element.aboveFold,
          contrastScore: element.contrastScore,
          attentionShare: element.attentionShare,
        })),
      attention: attention
        ? { primaryRegions: attention.primaryRegions, gazePath: attention.gazePath }
        : null,
      artifacts: viewportArtifacts,
    };
  });

  const report = reportRows[0]
    ? {
        modelName: reportRows[0].modelName,
        summary: reportRows[0].summary,
        issues: reportRows[0].issues,
        recommendations: reportRows[0].recommendations,
        abTestHypotheses: reportRows[0].abTestHypotheses,
      }
    : null;

  return NextResponse.json({ ok: true, analysis: analysisRows[0], report, viewports: result });
}
