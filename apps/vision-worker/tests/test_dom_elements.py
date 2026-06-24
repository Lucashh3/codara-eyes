from app.dom_elements import _cta_score, _has_fill, classify_dom


def _raw(kind, tag, x, y, w, h, **extra):
    base = {
        "kind": kind,
        "tag": tag,
        "role": "",
        "inputType": "",
        "text": "",
        "x": x,
        "y": y,
        "w": w,
        "h": h,
        "fontSize": 0,
        "fontWeight": 400,
        "bg": "rgba(0, 0, 0, 0)",
        "borderRadius": 0,
        "paddingX": 0,
        "inHeader": False,
    }
    base.update(extra)
    return base


def _by_type(elements):
    out = {}
    for e in elements:
        out.setdefault(e["type"], []).append(e)
    return out


def test_has_fill():
    assert _has_fill("rgb(59, 130, 246)") is True
    assert _has_fill("rgba(59, 130, 246, 1)") is True
    assert _has_fill("rgba(0, 0, 0, 0)") is False
    assert _has_fill("transparent") is False
    assert _has_fill("") is False


def test_cta_score_button_beats_nav_link():
    button = _raw("clickable", "button", 0, 0, 120, 40, text="Comprar agora")
    nav_link = _raw("clickable", "a", 0, 0, 80, 20, text="Sobre")
    assert _cta_score(button) >= 0.35
    assert _cta_score(nav_link) < 0.35


def test_classify_picks_headline_cta_nav_subheadline():
    raw = [
        _raw("nav", "header", 0, 0, 1440, 64),
        _raw("heading", "h1", 100, 120, 600, 60, text="Aumente suas conversoes", fontSize=48),
        _raw("heading", "h2", 100, 200, 500, 30, text="Sem complicacao", fontSize=24),
        _raw(
            "clickable", "a", 100, 300, 180, 50,
            text="Comecar gratis", bg="rgb(59, 130, 246)", borderRadius=8, paddingX=32,
        ),
        _raw("clickable", "a", 700, 20, 60, 24, text="Login"),  # nav link, nao CTA
        _raw("form", "form", 100, 400, 360, 200),
    ]
    # css_width = img_width => escala 1:1
    elements = classify_dom(raw, css_width=1440, img_shape=(2000, 1440), fold=900)
    by_type = _by_type(elements)

    assert by_type["headline"][0]["label"] == "Aumente suas conversoes"
    assert by_type["subheadline"][0]["label"] == "Sem complicacao"
    assert "nav" in by_type
    assert "form" in by_type
    assert len(by_type["cta"]) == 1
    assert by_type["cta"][0]["label"] == "Comecar gratis"
    assert all(e["above_fold"] for e in elements)


def test_classify_scales_bbox_to_image_space():
    # Mobile: pagina 390 css px -> imagem 1170 px (device scale 3) => escala 3x.
    raw = [_raw("heading", "h1", 20, 40, 200, 30, text="Titulo", fontSize=32)]
    elements = classify_dom(raw, css_width=390, img_shape=(2400, 1170), fold=900)
    assert len(elements) == 1
    assert elements[0]["bbox"] == (60, 120, 600, 90)


def test_classify_returns_empty_without_dom():
    assert classify_dom(None, 1440, (2000, 1440), 900) == []
    assert classify_dom([], 1440, (2000, 1440), 900) == []
    assert classify_dom([_raw("heading", "h1", 0, 0, 10, 10)], None, (2000, 1440), 900) == []


def test_classify_skips_elements_below_capture():
    raw = [_raw("heading", "h1", 0, 5000, 200, 30, text="Fora", fontSize=32)]
    # y escalado (5000) >= altura da imagem (2000) => descartado.
    assert classify_dom(raw, css_width=1440, img_shape=(2000, 1440), fold=900) == []
