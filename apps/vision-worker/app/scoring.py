"""Scores de UX (heuristica v1) a partir dos elementos + mapa de saliency.

Todos 0..1. Direcao (documentada para o relatorio/dashboard):
- MAIOR = melhor: cta_visibility, headline_attention, visual_hierarchy,
  above_the_fold_efficiency
- MAIOR = pior (problema): attention_competition, clutter_score

Formulas simples e proposital; podem evoluir sem mudar o contrato.
"""

from __future__ import annotations

from typing import Any

import numpy as np


def _clamp(value: float) -> float:
    return round(min(1.0, max(0.0, float(value))), 4)


def compute_scores(
    elements: list[dict[str, Any]],
    smap: np.ndarray,
    fold: int,
    img_shape: tuple[int, ...],
) -> dict[str, float]:
    height = img_shape[0]
    total = float(smap.sum()) + 1e-6
    fold_row = max(1, min(int(fold), height))
    above = float(smap[:fold_row].sum())

    # Primeiro elemento de cada tipo (headline/cta tendem a ser unicos).
    by_type: dict[str, dict[str, Any]] = {}
    for element in elements:
        by_type.setdefault(element["type"], element)

    shares = [max(0.0, float(e.get("attention_share") or 0.0)) for e in elements]
    shares_sum = sum(shares)
    rel = [s / shares_sum for s in shares] if shares_sum > 0 else []
    rel_sorted = sorted(rel, reverse=True)
    max_rel = rel_sorted[0] if rel_sorted else 0.0
    second_rel = rel_sorted[1] if len(rel_sorted) >= 2 else 0.0

    headline = by_type.get("headline")
    cta = by_type.get("cta")

    if cta:
        cta_visibility = (
            0.45 * min(1.0, float(cta.get("attention_share") or 0.0) / 0.10)
            + 0.35 * float(cta.get("contrast_score") or 0.0)
            + 0.20 * (1.0 if cta.get("above_fold") else 0.3)
        )
    else:
        cta_visibility = 0.15  # CTA nao detectado = baixa visibilidade

    if headline:
        headline_attention = 0.7 * min(1.0, float(headline.get("attention_share") or 0.0) / 0.22) + 0.3 * (
            1.0 if headline.get("above_fold") else 0.3
        )
    else:
        headline_attention = 0.20

    # Hierarquia: um elemento claramente dominante + gap para o segundo.
    visual_hierarchy = (max_rel * 0.7 + (max_rel - second_rel) * 0.3) if rel else 0.0

    # Competicao: alta quando nenhum elemento domina a atencao.
    attention_competition = (1.0 - max_rel) if rel else 0.0

    above_the_fold_efficiency = above / total

    # Clutter: muitos elementos + muita area "quente" no heatmap.
    hot_fraction = float((smap > 0.5).mean())
    clutter_score = 0.5 * min(1.0, len(elements) / 8.0) + 0.5 * hot_fraction

    return {
        "cta_visibility": _clamp(cta_visibility),
        "headline_attention": _clamp(headline_attention),
        "visual_hierarchy": _clamp(visual_hierarchy),
        "attention_competition": _clamp(attention_competition),
        "above_the_fold_efficiency": _clamp(above_the_fold_efficiency),
        "clutter_score": _clamp(clutter_score),
    }
