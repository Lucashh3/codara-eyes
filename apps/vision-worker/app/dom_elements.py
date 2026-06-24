"""Deteccao de elementos a partir do DOM capturado pelo Playwright.

Para inputs do tipo URL, o navegador entrega a estrutura semantica REAL da
pagina (headings, botoes, nav, form, imagens) com bounding boxes em pixels CSS.
Isso e muito mais confiavel do que adivinhar o tipo a partir de OCR + pixels --
caminho que passa a ser usado apenas como fallback para uploads de imagem, onde
nao existe DOM.

`classify_dom` e PURA (sem navegador), logo testavel: recebe os candidatos crus
extraidos no browser, a largura da pagina em CSS px e a forma da imagem
normalizada, e devolve elementos no MESMO formato/espaco de coordenadas que o
caminho OCR (bbox em pixels da imagem normalizada), para casar com os overlays
do dashboard. `contrast_score`/`attention_share` continuam sendo calculados em
`vision.py`, sobre a bbox -- aqui so decidimos tipo + rotulo + posicao.
"""

from __future__ import annotations

from typing import Any

MAX_CTA = 2
MAX_FORM = 2
MAX_TEXT_BLOCKS = 4
# Pontuacao minima para um clicavel ser considerado CTA (button-like).
CTA_MIN_SCORE = 0.35


def _has_fill(bg: str) -> bool:
    """True quando o background tem cor visivel (nao transparente)."""
    value = (bg or "").strip().lower()
    if not value or value in ("transparent", "none"):
        return False
    if value.startswith("rgba"):
        try:
            alpha = float(value[value.rindex(",") + 1 : value.rindex(")")])
            return alpha > 0.05
        except (ValueError, IndexError):
            return True
    return True  # rgb(...) ou nome de cor = opaco


def _cta_score(c: dict[str, Any]) -> float:
    """O quanto um clicavel parece um botao de acao (0..~1)."""
    tag = c.get("tag", "")
    role = c.get("role", "")
    input_type = c.get("inputType", "")
    score = 0.0
    if tag == "button" or role == "button" or input_type in ("submit", "button"):
        score += 0.6  # botao semantico = forte sinal
    if _has_fill(c.get("bg", "")):
        score += 0.25
    if (c.get("borderRadius") or 0) > 0:
        score += 0.1
    if (c.get("paddingX") or 0) >= 16:
        score += 0.1
    words = len((c.get("_text") or c.get("text") or "").split())
    if words == 0:
        score -= 0.3  # botao sem rotulo (icone) raramente e o CTA principal
    elif words <= 5:
        score += 0.1
    elif words > 8:
        score -= 0.25  # texto longo = provavelmente link de conteudo
    return score


def _heading_level(tag: str) -> int:
    if len(tag) == 2 and tag[0] == "h" and tag[1].isdigit():
        return int(tag[1])
    return 9


def _scale_bbox(
    c: dict[str, Any], scale: float, img_w: int, img_h: int
) -> tuple[int, int, int, int]:
    x = int(round(float(c.get("x", 0)) * scale))
    y = int(round(float(c.get("y", 0)) * scale))
    w = int(round(float(c.get("w", 0)) * scale))
    h = int(round(float(c.get("h", 0)) * scale))
    x0 = max(0, min(x, img_w - 1))
    y0 = max(0, min(y, img_h - 1))
    x1 = max(0, min(x + w, img_w))
    y1 = max(0, min(y + h, img_h))
    return (x0, y0, max(1, x1 - x0), max(1, y1 - y0))


def classify_dom(
    raw: list[dict[str, Any]] | None,
    css_width: float | None,
    img_shape: tuple[int, ...],
    fold: int,
) -> list[dict[str, Any]]:
    """Mapeia candidatos crus do DOM para elementos tipados no espaco da imagem.

    Devolve [] quando nao ha DOM utilizavel (entao `vision.py` cai no OCR).
    """
    if not raw or not css_width or css_width <= 0:
        return []

    img_h, img_w = int(img_shape[0]), int(img_shape[1])
    scale = img_w / float(css_width)

    cands: list[dict[str, Any]] = []
    for c in raw:
        bbox = _scale_bbox(c, scale, img_w, img_h)
        x, y, w, h = bbox
        if y >= img_h or w < 2 or h < 2:
            continue  # fora da area capturada / degenerado
        cands.append(
            {
                **c,
                "bbox": bbox,
                "_text": (c.get("text") or "").strip(),
                "area": w * h,
                "level": _heading_level(c.get("tag", "")),
            }
        )

    used: set[int] = set()
    out: list[dict[str, Any]] = []

    def above(c: dict[str, Any]) -> bool:
        return c["bbox"][1] < fold

    def emit(index: int, c: dict[str, Any], element_type: str) -> None:
        used.add(index)
        x, y, _w, _h = c["bbox"]
        out.append(
            {
                "type": element_type,
                "label": (c["_text"][:120] or None),
                "bbox": c["bbox"],
                "above_fold": bool(y < fold),
            }
        )

    # --- nav / header: barra larga mais ao topo -----------------------------
    navs = [
        (i, c)
        for i, c in enumerate(cands)
        if c.get("kind") == "nav" and c["bbox"][2] >= 0.4 * img_w
    ]
    if navs:
        i, c = min(navs, key=lambda t: t[1]["bbox"][1])
        emit(i, c, "nav")

    # --- headline: maior heading, priorizando h1 acima da dobra -------------
    headings = [(i, c) for i, c in enumerate(cands) if c.get("kind") == "heading"]
    headline_y: float | None = None
    headline_font = 0.0
    free_headings = [(i, c) for i, c in headings if i not in used]
    if free_headings:
        h1_above = [(i, c) for i, c in free_headings if c["tag"] == "h1" and above(c)]
        any_above = [(i, c) for i, c in free_headings if above(c)]
        pool = h1_above or any_above or free_headings
        i, c = max(pool, key=lambda t: (t[1].get("fontSize") or 0.0, t[1]["area"]))
        emit(i, c, "headline")
        headline_y = c["bbox"][1]
        headline_font = c.get("fontSize") or 0.0

    # --- subheadline: heading logo abaixo, menor, acima da dobra ------------
    if headline_y is not None:
        subs = [
            (i, c)
            for i, c in headings
            if i not in used
            and c["bbox"][1] >= headline_y
            and (c.get("fontSize") or 0.0) <= headline_font
            and above(c)
        ]
        if subs:
            i, c = min(subs, key=lambda t: t[1]["bbox"][1])
            emit(i, c, "subheadline")

    # --- cta: clicaveis com aparencia de botao ------------------------------
    clickables = [
        (i, c, _cta_score(c))
        for i, c in enumerate(cands)
        if c.get("kind") == "clickable" and i not in used
    ]
    clickables = [t for t in clickables if t[2] >= CTA_MIN_SCORE]
    clickables.sort(key=lambda t: (above(t[1]), t[2], t[1]["area"]), reverse=True)
    for i, c, _s in clickables[:MAX_CTA]:
        emit(i, c, "cta")

    # --- form ---------------------------------------------------------------
    forms = [(i, c) for i, c in enumerate(cands) if c.get("kind") == "form" and i not in used]
    forms.sort(key=lambda t: t[1]["bbox"][1])
    for i, c in forms[:MAX_FORM]:
        emit(i, c, "form")

    # --- logo + hero_image --------------------------------------------------
    images = [(i, c) for i, c in enumerate(cands) if c.get("kind") == "image" and i not in used]
    logos = [
        (i, c)
        for i, c in images
        if c.get("inHeader")
        and c["area"] <= 0.04 * img_w * img_h
        and c["bbox"][1] < fold * 0.5
    ]
    if logos:
        i, c = min(logos, key=lambda t: (t[1]["bbox"][1], t[1]["bbox"][0]))
        emit(i, c, "logo")
    heroes = [
        (i, c)
        for i, c in images
        if i not in used and above(c) and c["area"] >= 0.06 * img_w * img_h
    ]
    if heroes:
        i, c = max(heroes, key=lambda t: t[1]["area"])
        emit(i, c, "hero_image")

    # --- text_block: paragrafos/itens mais relevantes por area --------------
    texts = [
        (i, c)
        for i, c in enumerate(cands)
        if c.get("kind") == "text" and i not in used and len(c["_text"]) >= 12
    ]
    texts.sort(key=lambda t: t[1]["area"], reverse=True)
    for i, c in texts[:MAX_TEXT_BLOCKS]:
        emit(i, c, "text_block")

    return out
