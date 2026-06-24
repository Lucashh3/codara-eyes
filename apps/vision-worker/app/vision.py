"""Motor visual em CPU: saliency (OpenCV), OCR (Tesseract) e deteccao de
elementos por heuristica.

Tudo opera sobre a imagem NORMALIZADA (redimensionada), e as coordenadas
(bbox, regioes) ficam nesse mesmo espaco, para casar com os overlays que o
dashboard vai exibir. Heuristica simples e proposital: gera sinais uteis sem
modelo ML. As fases seguintes podem trocar a saliency por um modelo sem mudar
o contrato de dados.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from statistics import median
from typing import Any

import cv2
import numpy as np
import pytesseract
from pytesseract import Output

from app.dom_elements import classify_dom
from app.scoring import compute_scores

MAX_WIDTH = 1440
OCR_LANG = "por+eng"
OCR_MIN_CONF = 40
MAX_TEXT_BLOCKS = 4


@dataclass
class VisionResult:
    normalized_path: str
    heatmap_path: str
    focus_path: str
    elements: list[dict[str, Any]] = field(default_factory=list)
    primary_regions: list[dict[str, float]] = field(default_factory=list)
    gaze_path: list[dict[str, float]] = field(default_factory=list)
    scores: dict[str, float] = field(default_factory=dict)


# --- imagem -----------------------------------------------------------------

def _load_normalized(path: Path) -> np.ndarray:
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f"nao foi possivel ler a imagem {path}")
    height, width = img.shape[:2]
    if width > MAX_WIDTH:
        scale = MAX_WIDTH / width
        img = cv2.resize(img, (MAX_WIDTH, int(height * scale)), interpolation=cv2.INTER_AREA)
    return img


def _fold_px(viewport_type: str, width: int, height: int) -> int:
    # Altura da primeira dobra em pixels da imagem, derivada do device capturado.
    if viewport_type == "mobile":
        return min(height, int(width * 844 / 390))
    return min(height, int(width * 900 / 1440))  # desktop / upload


# --- saliency ---------------------------------------------------------------

def _saliency(img: np.ndarray) -> np.ndarray:
    engine = cv2.saliency.StaticSaliencyFineGrained_create()
    ok, smap = engine.computeSaliency(img)
    if not ok:
        return np.zeros(img.shape[:2], dtype="float32")
    # O range cru varia entre versoes do OpenCV; normaliza min-max para [0, 1].
    smap = smap.astype("float32")
    low, high = float(smap.min()), float(smap.max())
    if high <= low:
        return np.zeros(img.shape[:2], dtype="float32")
    return (smap - low) / (high - low)


def _heatmap(img: np.ndarray, smap: np.ndarray) -> np.ndarray:
    heat = cv2.applyColorMap((smap * 255).astype("uint8"), cv2.COLORMAP_JET)
    return cv2.addWeighted(img, 0.55, heat, 0.45, 0)


def _focus(img: np.ndarray, smap: np.ndarray) -> np.ndarray:
    mask = cv2.GaussianBlur(smap, (0, 0), 9)
    mask = np.clip(mask * 1.4, 0.18, 1.0)
    mask3 = cv2.merge([mask, mask, mask])
    return (img.astype("float32") * mask3).astype("uint8")


def _primary_regions(smap: np.ndarray, top: int = 4) -> list[dict[str, float]]:
    gray = (smap * 255).astype("uint8")
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    regions = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w * h < 400:
            continue
        intensity = float(smap[y : y + h, x : x + w].mean())
        regions.append((w * h, x + w // 2, y + h // 2, intensity))
    regions.sort(reverse=True)  # maiores areas primeiro
    chosen = sorted(regions[:top], key=lambda r: -r[3])  # depois por intensidade
    return [{"x": cx, "y": cy, "intensity": round(i, 4)} for (_, cx, cy, i) in chosen]


def _gaze_path(regions: list[dict[str, float]]) -> list[dict[str, float]]:
    # Estimativa simples de ordem de leitura: cima -> baixo, esquerda -> direita.
    ordered = sorted(regions, key=lambda r: (r["y"], r["x"]))
    return [{"x": r["x"], "y": r["y"], "order": i + 1} for i, r in enumerate(ordered)]


# --- OCR + elementos --------------------------------------------------------

def _ocr_lines(img: np.ndarray) -> list[dict[str, Any]]:
    data = pytesseract.image_to_data(img, lang=OCR_LANG, output_type=Output.DICT)
    grouped: dict[tuple, dict[str, Any]] = {}
    for i in range(len(data["text"])):
        text = data["text"][i].strip()
        try:
            conf = float(data["conf"][i])
        except (ValueError, TypeError):
            conf = -1.0
        if not text or conf < OCR_MIN_CONF:
            continue
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        line = grouped.setdefault(
            key, {"x0": x, "y0": y, "x1": x + w, "y1": y + h, "words": [], "heights": []}
        )
        line["x0"] = min(line["x0"], x)
        line["y0"] = min(line["y0"], y)
        line["x1"] = max(line["x1"], x + w)
        line["y1"] = max(line["y1"], y + h)
        line["words"].append(text)
        line["heights"].append(h)

    lines = []
    for line in grouped.values():
        lines.append(
            {
                "text": " ".join(line["words"]),
                "bbox": (line["x0"], line["y0"], line["x1"] - line["x0"], line["y1"] - line["y0"]),
                "height": median(line["heights"]),
                "word_count": len(line["words"]),
            }
        )
    return lines


def _page_bg(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    s = 8
    corners = [img[0:s, 0:s], img[0:s, w - s : w], img[h - s : h, 0:s], img[h - s : h, w - s : w]]
    return np.mean(np.concatenate([c.reshape(-1, 3) for c in corners], axis=0), axis=0)


def _region_contrast(gray: np.ndarray, bbox: tuple[int, int, int, int]) -> float:
    x, y, w, h = bbox
    height, width = gray.shape
    pad = max(8, int(h * 0.6))
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(width, x + w + pad), min(height, y + h + pad)
    inner = gray[y : y + h, x : x + w]
    outer = gray[y0:y1, x0:x1]
    if inner.size == 0 or outer.size == 0:
        return 0.0
    li, lo = float(inner.mean()) / 255.0, float(outer.mean()) / 255.0
    ratio = (max(li, lo) + 0.05) / (min(li, lo) + 0.05)  # 1..21 (WCAG-ish)
    return round(min(1.0, (ratio - 1.0) / 20.0), 4)


def _button_score(img: np.ndarray, bbox: tuple[int, int, int, int], page_bg: np.ndarray) -> float:
    x, y, w, h = bbox
    height, width = img.shape[:2]
    pad = max(6, int(h * 0.4))
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(width, x + w + pad), min(height, y + h + pad)
    region = img[y0:y1, x0:x1].reshape(-1, 3)
    if region.size == 0:
        return 0.0
    diff = float(np.linalg.norm(np.mean(region, axis=0) - page_bg)) / (255.0 * np.sqrt(3))
    return min(1.0, diff * 2.0)


def _classify(lines: list[dict[str, Any]], img: np.ndarray, fold: int) -> list[dict[str, Any]]:
    if not lines:
        return []

    page_bg = _page_bg(img)
    img_h = img.shape[0]
    used: set[int] = set()
    elements: list[dict[str, Any]] = []

    def add(line: dict[str, Any], element_type: str) -> None:
        x, y, w, h = line["bbox"]
        elements.append(
            {
                "type": element_type,
                "label": line["text"][:120],
                "bbox": (int(x), int(y), int(w), int(h)),
                "above_fold": y < fold,
            }
        )

    # Headline: linha mais alta no terco/metade superior.
    top_lines = [(i, l) for i, l in enumerate(lines) if l["bbox"][1] < img_h * 0.55]
    pool = top_lines or list(enumerate(lines))
    hi, headline = max(pool, key=lambda item: item[1]["height"])
    used.add(hi)
    add(headline, "headline")

    # Subheadline: abaixo da headline, menor, mas ainda destacada.
    sub_candidates = [
        (i, l)
        for i, l in enumerate(lines)
        if i not in used
        and l["bbox"][1] > headline["bbox"][1]
        and 0.4 * headline["height"] <= l["height"] <= 0.9 * headline["height"]
    ]
    if sub_candidates:
        si, sub = min(sub_candidates, key=lambda item: item[1]["bbox"][1])
        used.add(si)
        add(sub, "subheadline")

    # CTA: linha curta com fundo destacado (button-like).
    cta_candidates = [
        (i, l, _button_score(img, l["bbox"], page_bg))
        for i, l in enumerate(lines)
        if i not in used and l["word_count"] <= 4
    ]
    cta_candidates = [c for c in cta_candidates if c[2] >= 0.08]
    if cta_candidates:
        ci, cta, _ = max(cta_candidates, key=lambda item: item[2])
        used.add(ci)
        add(cta, "cta")

    # Demais blocos de texto relevantes (por altura).
    remaining = [(i, l) for i, l in enumerate(lines) if i not in used]
    remaining.sort(key=lambda item: item[1]["height"], reverse=True)
    for _, line in remaining[:MAX_TEXT_BLOCKS]:
        add(line, "text_block")

    return elements


# --- orquestracao -----------------------------------------------------------

def analyze_viewport(
    source_path: Path,
    viewport_type: str,
    artifacts_dir: Path,
    analysis_id: str,
    dom_elements: list[dict[str, Any]] | None = None,
    css_width: float | None = None,
) -> VisionResult:
    img = _load_normalized(source_path)
    height, width = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    fold = _fold_px(viewport_type, width, height)

    smap = _saliency(img)
    total_saliency = float(smap.sum()) + 1e-6

    base = f"analyses/{analysis_id}/{viewport_type}"
    out_dir = artifacts_dir / "analyses" / analysis_id / viewport_type
    out_dir.mkdir(parents=True, exist_ok=True)

    normalized_rel = f"{base}/normalized.png"
    heatmap_rel = f"{base}/heatmap.png"
    focus_rel = f"{base}/focus.png"
    cv2.imwrite(str(artifacts_dir / normalized_rel), img)
    cv2.imwrite(str(artifacts_dir / heatmap_rel), _heatmap(img, smap))
    cv2.imwrite(str(artifacts_dir / focus_rel), _focus(img, smap))

    # Fonte primaria: estrutura semantica do DOM (URLs). Sem DOM (uploads) ou se
    # nada for classificado, cai no caminho OCR + heuristica de pixels.
    elements = classify_dom(dom_elements, css_width, img.shape, fold)
    if not elements:
        elements = _classify(_ocr_lines(img), img, fold)
    for element in elements:
        x, y, w, h = element["bbox"]
        element["contrast_score"] = _region_contrast(gray, (x, y, w, h))
        element["attention_share"] = round(float(smap[y : y + h, x : x + w].sum()) / total_saliency, 4)

    regions = _primary_regions(smap)
    scores = compute_scores(elements, smap, fold, img.shape)
    return VisionResult(
        normalized_path=normalized_rel,
        heatmap_path=heatmap_rel,
        focus_path=focus_rel,
        elements=elements,
        primary_regions=regions,
        gaze_path=_gaze_path(regions),
        scores=scores,
    )
