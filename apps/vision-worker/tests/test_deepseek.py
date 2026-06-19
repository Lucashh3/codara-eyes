from app.deepseek import _fallback, _validate, build_payload


def test_build_payload_shape():
    payload = build_payload(
        "landing_page",
        "lead_generation",
        [
            {
                "type": "desktop",
                "scores": {"cta_visibility": 0.5},
                "elements": [
                    {
                        "type": "cta",
                        "label": "Comecar",
                        "above_fold": True,
                        "attention_share": 0.1,
                        "contrast_score": 0.3,
                    }
                ],
            }
        ],
    )
    assert payload["page_type"] == "landing_page"
    assert payload["goal"] == "lead_generation"
    assert payload["viewports"][0]["elements"][0]["type"] == "cta"


def test_validate_filters_empty_and_caps_recommendations():
    out = _validate(
        {"summary": "  ok  ", "priority_issues": ["a", "", "b"], "recommendations": ["r"] * 8}
    )
    assert out["summary"] == "ok"
    assert out["issues"] == ["a", "b"]
    assert len(out["recommendations"]) == 5


def test_validate_tolerates_garbage():
    out = _validate({})
    assert out["summary"] == "Sem resumo."
    assert out["issues"] == [] and out["recommendations"] == []


def test_fallback_respects_score_direction():
    payload = {
        "page_type": "landing_page",
        "goal": "lead_generation",
        "viewports": [{"scores": {"cta_visibility": 0.3, "attention_competition": 0.8}}],
    }
    report = _fallback(payload)
    assert report["model_name"] == "fallback"
    assert any("CTA" in issue for issue in report["issues"])
    assert any("competem" in issue for issue in report["issues"])
    assert len(report["recommendations"]) <= 5
