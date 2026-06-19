from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


ViewportType = Literal["desktop", "mobile"]
ElementType = Literal[
    "headline",
    "subheadline",
    "cta",
    "form",
    "logo",
    "nav",
    "hero_image",
    "trust_badge",
    "text_block",
]


class BoundingBox(BaseModel):
    x: float
    y: float
    w: float
    h: float


class DetectedElement(BaseModel):
    id: str
    type: ElementType
    label: str | None = None
    bbox: BoundingBox
    above_fold: bool = Field(alias="aboveFold")
    contrast_score: float | None = Field(default=None, alias="contrastScore")

    model_config = {"populate_by_name": True}


class AnalyzeImageRequest(BaseModel):
    analysis_id: str = Field(alias="analysisId")
    viewport: ViewportType
    image_url: HttpUrl = Field(alias="imageUrl")
    page_type: str = Field(alias="pageType")

    model_config = {"populate_by_name": True}


class ArtifactSet(BaseModel):
    source_image_url: HttpUrl = Field(alias="sourceImageUrl")
    normalized_image_url: HttpUrl = Field(alias="normalizedImageUrl")
    heatmap_url: HttpUrl = Field(alias="heatmapUrl")
    focus_map_url: HttpUrl = Field(alias="focusMapUrl")

    model_config = {"populate_by_name": True}


class PrimaryRegion(BaseModel):
    x: float
    y: float
    intensity: float


class GazePoint(BaseModel):
    x: float
    y: float
    order: int


class ElementShare(BaseModel):
    element_id: str = Field(alias="elementId")
    attention_share: float = Field(alias="attentionShare")

    model_config = {"populate_by_name": True}


class AttentionSummary(BaseModel):
    primary_regions: list[PrimaryRegion] = Field(alias="primaryRegions")
    gaze_path: list[GazePoint] = Field(alias="gazePath")
    element_shares: list[ElementShare] = Field(alias="elementShares")

    model_config = {"populate_by_name": True}


class ScoreSummary(BaseModel):
    cta_visibility: float = Field(alias="ctaVisibility")
    headline_attention: float = Field(alias="headlineAttention")
    visual_hierarchy: float = Field(alias="visualHierarchy")
    attention_competition: float = Field(alias="attentionCompetition")
    above_the_fold_efficiency: float = Field(alias="aboveTheFoldEfficiency")
    clutter_score: float = Field(alias="clutterScore")

    model_config = {"populate_by_name": True}


class AnalysisResponse(BaseModel):
    analysis_id: str = Field(alias="analysisId")
    viewport: ViewportType
    artifacts: ArtifactSet
    elements: list[DetectedElement]
    attention: AttentionSummary
    scores: ScoreSummary

    model_config = {"populate_by_name": True}
