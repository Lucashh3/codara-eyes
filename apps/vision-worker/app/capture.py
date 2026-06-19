"""Captura de paginas com Playwright (desktop + mobile) e leitura de imagens.

Para inputs do tipo URL, abre a pagina em dois viewports, espera a pagina
estabilizar e tira um screenshot de pagina inteira. As dimensoes salvas no
banco sao as do PROPRIO arquivo de imagem (pixels), para casar com a analise
visual das fases seguintes.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from playwright.sync_api import sync_playwright

from app.imaging import read_image_size

GOTO_TIMEOUT_MS = int(os.environ.get("CAPTURE_GOTO_TIMEOUT_MS", "45000"))
NETWORK_IDLE_TIMEOUT_MS = int(os.environ.get("CAPTURE_NETWORK_IDLE_TIMEOUT_MS", "8000"))
SETTLE_MS = int(os.environ.get("CAPTURE_SETTLE_MS", "800"))
# Limite de altura (px CSS) para nao gerar screenshots gigantes de paginas
# muito longas, o que estouraria a latencia da analise.
MAX_FULLPAGE_HEIGHT = int(os.environ.get("MAX_FULLPAGE_HEIGHT", "12000"))


@dataclass
class CaptureResult:
    viewport_type: str
    width: int
    height: int
    storage_path: str  # relativo ao ARTIFACTS_DIR, com barras "/"


def _capture_one(browser, context_kwargs: dict, url: str, out_path: Path) -> tuple[int, int]:
    context = browser.new_context(**context_kwargs)
    try:
        page = context.new_page()
        page.goto(url, wait_until="load", timeout=GOTO_TIMEOUT_MS)
        try:
            page.wait_for_load_state("networkidle", timeout=NETWORK_IDLE_TIMEOUT_MS)
        except Exception:
            pass  # paginas com polling nunca ficam idle; seguimos mesmo assim
        page.wait_for_timeout(SETTLE_MS)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        dims = page.evaluate(
            "() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })"
        )
        if dims and dims.get("h", 0) > MAX_FULLPAGE_HEIGHT:
            # Pagina muito longa: corta na altura maxima em vez de full_page.
            page.screenshot(
                path=str(out_path),
                clip={"x": 0, "y": 0, "width": dims["w"], "height": MAX_FULLPAGE_HEIGHT},
            )
        else:
            page.screenshot(path=str(out_path), full_page=True)
    finally:
        context.close()
    return read_image_size(out_path)


def capture_url(url: str, artifacts_dir: Path, analysis_id: str) -> list[CaptureResult]:
    results: list[CaptureResult] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        try:
            # Desktop
            desktop_rel = f"analyses/{analysis_id}/desktop/source.png"
            width, height = _capture_one(
                browser,
                {"viewport": {"width": 1440, "height": 900}, "device_scale_factor": 1},
                url,
                artifacts_dir / desktop_rel,
            )
            results.append(CaptureResult("desktop", width, height, desktop_rel))

            # Mobile (descritor de device do Playwright, sem a chave nao aceita pelo contexto)
            device = {k: v for k, v in p.devices["iPhone 13"].items() if k != "default_browser_type"}
            mobile_rel = f"analyses/{analysis_id}/mobile/source.png"
            width, height = _capture_one(browser, device, url, artifacts_dir / mobile_rel)
            results.append(CaptureResult("mobile", width, height, mobile_rel))
        finally:
            browser.close()
    return results
