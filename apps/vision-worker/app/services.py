from app.models import (
    AnalysisResponse,
    AnalyzeImageRequest,
    ArtifactSet,
    AttentionSummary,
    DetectedElement,
    BoundingBox,
    ElementShare,
    GazePoint,
    PrimaryRegion,
    ScoreSummary,
)


def build_stubbed_analysis(payload: AnalyzeImageRequest) -> AnalysisResponse:
    return AnalysisResponse(
        analysisId=payload.analysis_id,
        viewport=payload.viewport,
        artifacts=ArtifactSet(
            sourceImageUrl=payload.image_url,
            normalizedImageUrl=payload.image_url,
            heatmapUrl=payload.image_url,
            focusMapUrl=payload.image_url,
        ),
        elements=[
            DetectedElement(
                id="headline_1",
                type="headline",
                label="Hero principal",
                bbox=BoundingBox(x=120, y=180, w=760, h=132),
                aboveFold=True,
                contrastScore=0.88,
            ),
            DetectedElement(
                id="cta_primary",
                type="cta",
                label="Comecar agora",
                bbox=BoundingBox(x=140, y=420, w=220, h=56),
                aboveFold=True,
                contrastScore=0.82,
            ),
        ],
        attention=AttentionSummary(
            primaryRegions=[
                PrimaryRegion(x=260, y=220, intensity=0.92),
                PrimaryRegion(x=240, y=440, intensity=0.71),
            ],
            gazePath=[
                GazePoint(x=260, y=220, order=1),
                GazePoint(x=240, y=440, order=2),
            ],
            elementShares=[
                ElementShare(elementId="headline_1", attentionShare=0.33),
                ElementShare(elementId="cta_primary", attentionShare=0.18),
            ],
        ),
        scores=ScoreSummary(
            ctaVisibility=0.74,
            headlineAttention=0.81,
            visualHierarchy=0.69,
            attentionCompetition=0.41,
            aboveTheFoldEfficiency=0.77,
            clutterScore=0.29,
        ),
    )
