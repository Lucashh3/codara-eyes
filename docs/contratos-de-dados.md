# Contratos de Dados

## Principio

Todos os modulos devem trocar dados em formato estruturado e previsivel. O `LLM` nao deve receber apenas imagem solta; ele deve receber contexto e dados numericos.

## Criacao de analise

### Request
```json
{
  "project_id": "uuid",
  "input_type": "url",
  "page_type": "landing_page",
  "url": "https://example.com"
}
```

### Response
```json
{
  "analysis_id": "uuid",
  "status": "pending"
}
```

## Saida do capture engine

```json
{
  "analysis_id": "uuid",
  "viewports": [
    {
      "type": "desktop",
      "width": 1440,
      "height": 2200,
      "artifact_url": "..."
    },
    {
      "type": "mobile",
      "width": 390,
      "height": 2400,
      "artifact_url": "..."
    }
  ]
}
```

## Saida do vision worker

```json
{
  "analysis_id": "uuid",
  "viewport": "desktop",
  "artifacts": {
    "source_image_url": "...",
    "normalized_image_url": "...",
    "heatmap_url": "...",
    "focus_map_url": "..."
  },
  "elements": [
    {
      "id": "cta_primary",
      "type": "cta",
      "label": "Comecar agora",
      "bbox": {
        "x": 120,
        "y": 540,
        "w": 220,
        "h": 56
      },
      "above_fold": true,
      "contrast_score": 0.84
    }
  ],
  "attention": {
    "primary_regions": [],
    "gaze_path": [],
    "element_shares": [
      {
        "element_id": "cta_primary",
        "attention_share": 0.14
      }
    ]
  },
  "scores": {
    "cta_visibility": 0.72,
    "headline_attention": 0.61,
    "visual_hierarchy": 0.68,
    "attention_competition": 0.44,
    "above_the_fold_efficiency": 0.78,
    "clutter_score": 0.31
  }
}
```

## Payload para DeepSeek V4

```json
{
  "analysis_id": "uuid",
  "page_type": "landing_page",
  "goal": "lead_generation",
  "viewport": "desktop",
  "elements": [],
  "scores": {},
  "attention_summary": {},
  "instructions": {
    "tone": "executivo e pratico",
    "max_recommendations": 5
  }
}
```

## Saida esperada do relatorio

```json
{
  "summary": "A pagina concentra atencao no hero, mas o CTA principal perde relevancia.",
  "priority_issues": [
    "CTA principal com competicao excessiva",
    "Hierarquia visual dispersa"
  ],
  "recommendations": [
    "Aumentar contraste do CTA principal",
    "Reduzir peso visual do elemento secundario"
  ],
  "ab_test_hypotheses": [
    "Testar CTA com fundo solido e maior distancia dos elementos decorativos"
  ]
}
```
