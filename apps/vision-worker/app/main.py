from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import db_ok
from app.models import AnalysisResponse, AnalyzeImageRequest
from app.services import build_stubbed_analysis
from app.worker import JobWorker

job_worker = JobWorker()


@asynccontextmanager
async def lifespan(app: FastAPI):
    job_worker.start()
    try:
        yield
    finally:
        job_worker.stop()


app = FastAPI(
    title="Codara Eyes Vision Worker",
    version="0.1.0",
    description="Worker visual inicial para pipeline de heatmap e analise de UX.",
    lifespan=lifespan,
)


@app.get("/health")
def healthcheck() -> dict[str, object]:
    return {
        "ok": True,
        "service": "vision-worker",
        "db": db_ok(),
    }


@app.post("/analyze-image", response_model=AnalysisResponse)
def analyze_image(payload: AnalyzeImageRequest) -> AnalysisResponse:
    return build_stubbed_analysis(payload)


@app.post("/generate-heatmap", response_model=AnalysisResponse)
def generate_heatmap(payload: AnalyzeImageRequest) -> AnalysisResponse:
    return build_stubbed_analysis(payload)


@app.post("/score-analysis", response_model=AnalysisResponse)
def score_analysis(payload: AnalyzeImageRequest) -> AnalysisResponse:
    return build_stubbed_analysis(payload)
