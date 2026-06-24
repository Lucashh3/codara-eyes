"""Captura de paginas com Playwright (desktop + mobile) e leitura de imagens.

Para inputs do tipo URL, abre a pagina em dois viewports, espera a pagina
estabilizar e tira um screenshot de pagina inteira. As dimensoes salvas no
banco sao as do PROPRIO arquivo de imagem (pixels), para casar com a analise
visual das fases seguintes.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from playwright.sync_api import sync_playwright

from app.imaging import read_image_size

GOTO_TIMEOUT_MS = int(os.environ.get("CAPTURE_GOTO_TIMEOUT_MS", "45000"))
NETWORK_IDLE_TIMEOUT_MS = int(os.environ.get("CAPTURE_NETWORK_IDLE_TIMEOUT_MS", "8000"))
SETTLE_MS = int(os.environ.get("CAPTURE_SETTLE_MS", "800"))
# Limite de altura (px CSS) para nao gerar screenshots gigantes de paginas
# muito longas, o que estouraria a latencia da analise.
MAX_FULLPAGE_HEIGHT = int(os.environ.get("MAX_FULLPAGE_HEIGHT", "12000"))

# Extrai a estrutura semantica da pagina viva (fonte de verdade dos elementos).
# Devolve candidatos crus em pixels CSS, posicao absoluta (rect + scroll); a
# classificacao em tipos acontece em `app/dom_elements.py` (Python, testavel).
_DOM_EXTRACT_JS = """
() => {
  const out = [];
  const seen = new Set();
  const push = (el, kind) => {
    if (!el || seen.has(el)) return;
    let r;
    try { r = el.getBoundingClientRect(); } catch (e) { return; }
    if (!r || r.width < 4 || r.height < 4) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity || '1') < 0.1) return;
    const text = ((el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('alt') || '') + '').trim();
    seen.add(el);
    out.push({
      kind,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || '',
      inputType: el.getAttribute('type') || '',
      text: text.slice(0, 200),
      x: r.left + window.scrollX,
      y: r.top + window.scrollY,
      w: r.width,
      h: r.height,
      fontSize: parseFloat(cs.fontSize) || 0,
      fontWeight: parseInt(cs.fontWeight) || 400,
      bg: cs.backgroundColor || '',
      borderRadius: parseFloat(cs.borderTopLeftRadius) || 0,
      paddingX: (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0),
      inHeader: !!(el.closest && el.closest('header, nav, [role=banner], [role=navigation]')),
    });
  };
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(e => push(e, 'heading'));
  document.querySelectorAll('button, [role=button], input[type=submit], input[type=button], a').forEach(e => push(e, 'clickable'));
  document.querySelectorAll('form').forEach(e => push(e, 'form'));
  document.querySelectorAll('nav, header, [role=navigation], [role=banner]').forEach(e => push(e, 'nav'));
  document.querySelectorAll('img, [role=img], header svg, nav svg').forEach(e => push(e, 'image'));
  document.querySelectorAll('p, li').forEach(e => push(e, 'text'));
  return out;
}
"""


@dataclass
class CaptureResult:
    viewport_type: str
    width: int
    height: int
    storage_path: str  # relativo ao ARTIFACTS_DIR, com barras "/"
    # Largura da pagina em pixels CSS (referencia p/ escalar as bbox do DOM ao
    # espaco da imagem normalizada) e os candidatos crus extraidos do DOM.
    css_width: float = 0.0
    dom_elements: list[dict[str, Any]] = field(default_factory=list)


def _extract_dom(page) -> list[dict[str, Any]]:
    # Nunca derruba a captura por causa do DOM: em caso de erro, devolve [] e o
    # pipeline cai no caminho OCR.
    try:
        elements = page.evaluate(_DOM_EXTRACT_JS)
        return elements if isinstance(elements, list) else []
    except Exception:
        return []


def _capture_one(
    browser, context_kwargs: dict, url: str, out_path: Path
) -> tuple[int, int, float, list[dict[str, Any]]]:
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
        css_width = float(dims["w"]) if dims and dims.get("w") else 0.0
        # Extrai o DOM antes do screenshot (pagina no topo => rect+scroll = abs).
        dom_elements = _extract_dom(page)
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
    width, height = read_image_size(out_path)
    return width, height, css_width, dom_elements


def capture_url(url: str, artifacts_dir: Path, analysis_id: str) -> list[CaptureResult]:
    results: list[CaptureResult] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        try:
            # Desktop
            desktop_rel = f"analyses/{analysis_id}/desktop/source.png"
            width, height, css_width, dom = _capture_one(
                browser,
                {"viewport": {"width": 1440, "height": 900}, "device_scale_factor": 1},
                url,
                artifacts_dir / desktop_rel,
            )
            results.append(CaptureResult("desktop", width, height, desktop_rel, css_width, dom))

            # Mobile (descritor de device do Playwright, sem a chave nao aceita pelo contexto)
            device = {k: v for k, v in p.devices["iPhone 13"].items() if k != "default_browser_type"}
            mobile_rel = f"analyses/{analysis_id}/mobile/source.png"
            width, height, css_width, dom = _capture_one(browser, device, url, artifacts_dir / mobile_rel)
            results.append(CaptureResult("mobile", width, height, mobile_rel, css_width, dom))
        finally:
            browser.close()
    return results
