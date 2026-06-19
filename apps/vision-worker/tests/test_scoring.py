import numpy as np

from app.scoring import compute_scores

SCORE_KEYS = {
    "cta_visibility",
    "headline_attention",
    "visual_hierarchy",
    "attention_competition",
    "above_the_fold_efficiency",
    "clutter_score",
}


def _smap() -> np.ndarray:
    smap = np.zeros((1000, 800), dtype="float32")
    smap[60:130, 100:600] = 0.9  # headline
    smap[300:360, 300:520] = 0.7  # cta
    return smap


def test_scores_have_all_keys_in_range():
    elements = [
        {"type": "headline", "above_fold": True, "contrast_score": 0.8, "attention_share": 0.3},
        {"type": "cta", "above_fold": True, "contrast_score": 0.7, "attention_share": 0.12},
    ]
    scores = compute_scores(elements, _smap(), 625, (1000, 800))
    assert set(scores) == SCORE_KEYS
    assert all(0.0 <= v <= 1.0 for v in scores.values())


def test_missing_cta_and_headline_use_fallbacks():
    scores = compute_scores([], _smap(), 625, (1000, 800))
    assert scores["cta_visibility"] == 0.15
    assert scores["headline_attention"] == 0.20


def test_strong_cta_scores_high():
    elements = [{"type": "cta", "above_fold": True, "contrast_score": 0.9, "attention_share": 0.15}]
    scores = compute_scores(elements, _smap(), 625, (1000, 800))
    assert scores["cta_visibility"] > 0.7


def test_above_fold_efficiency_drops_when_attention_below_fold():
    # Toda a saliency abaixo da dobra -> eficiencia baixa.
    smap = np.zeros((1000, 800), dtype="float32")
    smap[800:900, 100:600] = 0.9
    scores = compute_scores([], smap, 400, (1000, 800))
    assert scores["above_the_fold_efficiency"] < 0.1
