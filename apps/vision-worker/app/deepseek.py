"""Relatorio interpretativo via DeepSeek (API compativel com OpenAI).

Recebe dados estruturados (tipo da pagina, elementos, scores) e devolve um
relatorio em JSON. Resiliente: sem chave ou em caso de erro da API, gera um
relatorio baseado em regras a partir dos scores, para o pipeline nunca travar
por causa do LLM.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.request
from typing import Any

logger = logging.getLogger("vision_worker.deepseek")

REQUEST_TIMEOUT = 60

SYSTEM_PROMPT = (
    "Voce e um especialista em UX e CRO para landing pages. Analise APENAS os "
    "dados estruturados fornecidos (elementos detectados, scores e atencao). Nao "
    "invente elementos que nao estao nos dados. Responda em portugues, com tom "
    "executivo e pratico. Os scores vao de 0 a 1; para cta_visibility, "
    "headline_attention, visual_hierarchy e above_the_fold_efficiency MAIOR e "
    "melhor; para attention_competition e clutter_score MAIOR e pior. Nao "
    "contradiga os scores. Responda SOMENTE com um objeto JSON valido com as "
    "chaves: summary (string), priority_issues (array de strings), "
    "recommendations (array com no maximo 5 strings) e ab_test_hypotheses "
    "(array de strings)."
)


def build_payload(page_type: str, goal: str, viewports: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "page_type": page_type,
        "goal": goal,
        "viewports": [
            {
                "type": vp["type"],
                "scores": vp["scores"],
                "elements": [
                    {
                        "type": e["type"],
                        "label": e.get("label"),
                        "above_fold": e["above_fold"],
                        "attention_share": e.get("attention_share"),
                        "contrast": e.get("contrast_score"),
                    }
                    for e in vp["elements"][:8]
                ],
            }
            for vp in viewports
        ],
    }


def generate_report(payload: dict[str, Any]) -> dict[str, Any]:
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        logger.info("sem DEEPSEEK_API_KEY; usando relatorio fallback")
        return _fallback(payload)

    base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": "Dados da analise (JSON):\n"
            + json.dumps(payload, ensure_ascii=False)
            + "\n\nGere o relatorio em JSON.",
        },
    ]

    try:
        content = _call_api(base_url, api_key, model, messages)
        report = _validate(json.loads(content))
        report["model_name"] = model
        return report
    except Exception as exc:  # noqa: BLE001
        logger.warning("DeepSeek falhou (%s); usando relatorio fallback", exc)
        return _fallback(payload)


def _call_api(base_url: str, api_key: str, model: str, messages: list[dict[str, str]]) -> str:
    url = base_url.rstrip("/") + "/chat/completions"
    body = json.dumps(
        {
            "model": model,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.3,
            "max_tokens": 900,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
        data = json.loads(response.read())
    return data["choices"][0]["message"]["content"]


def _validate(data: dict[str, Any]) -> dict[str, Any]:
    def to_list(value: Any, limit: int) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()][:limit]

    summary = str(data.get("summary", "")).strip() or "Sem resumo."
    return {
        "summary": summary[:2000],
        "issues": to_list(data.get("priority_issues") or data.get("issues"), 6),
        "recommendations": to_list(data.get("recommendations"), 5),
        "ab_test_hypotheses": to_list(data.get("ab_test_hypotheses") or data.get("hypotheses"), 6),
    }


def _fallback(payload: dict[str, Any]) -> dict[str, Any]:
    viewports = payload.get("viewports") or [{}]
    scores: dict[str, float] = viewports[0].get("scores", {})

    def low(key: str) -> bool:
        return scores.get(key, 1.0) < 0.5

    def high(key: str) -> bool:
        return scores.get(key, 0.0) > 0.5

    issues: list[str] = []
    recommendations: list[str] = []

    if low("cta_visibility"):
        issues.append("CTA principal com baixa visibilidade.")
        recommendations.append("Aumentar contraste e isolamento do CTA principal.")
    if low("headline_attention"):
        issues.append("Headline atrai pouca atencao.")
        recommendations.append("Reforcar tamanho/contraste da headline acima da dobra.")
    if low("visual_hierarchy"):
        issues.append("Hierarquia visual pouco clara.")
        recommendations.append("Definir um unico elemento dominante por secao.")
    if high("attention_competition"):
        issues.append("Muitos elementos competem por atencao.")
        recommendations.append("Reduzir peso visual de elementos secundarios.")
    if low("above_the_fold_efficiency"):
        issues.append("Pouca atencao concentrada acima da dobra.")
        recommendations.append("Mover proposta de valor e CTA para o topo.")
    if high("clutter_score"):
        issues.append("Layout visualmente poluido.")
        recommendations.append("Aumentar espaco em branco e remover ruido visual.")

    if not issues:
        issues.append("Nenhum problema critico evidente nos sinais atuais.")
    if not recommendations:
        recommendations.append("Manter a estrutura e testar variacoes pontuais.")

    summary = (
        f"Relatorio automatico (sem IA) para pagina '{payload.get('page_type', '')}' "
        f"com objetivo '{payload.get('goal', '')}', baseado nos scores calculados."
    )
    return {
        "model_name": "fallback",
        "summary": summary,
        "issues": issues[:6],
        "recommendations": recommendations[:5],
        "ab_test_hypotheses": ["Testar variacao do CTA principal (cor, copy e posicao)."],
    }
