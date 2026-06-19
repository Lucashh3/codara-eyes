# Codara Eyes

Plataforma de **análise preditiva de atenção visual** para landing pages —
inspirada em produtos como VisualEyes e Neurons. Envie uma `URL` ou um
`screenshot` e receba heatmap de atenção, focus map, scorecards de UX,
relatório com IA e comparação A/B entre versões.

Roda inteira em uma VPS com Docker, sem dependência de SaaS além da API do
DeepSeek (que ainda tem fallback por regras).

## Stack

- **web** ([apps/web](apps/web)): Next.js 15 + React 19 + Tailwind v4, Drizzle ORM
- **vision-worker** ([apps/vision-worker](apps/vision-worker)): Python + FastAPI,
  Playwright (captura), DeepGaze IIE (saliency, eye-tracking) com fallback OpenCV
  + Tesseract (OCR), DeepSeek (relatório)
- **shared** ([packages/shared](packages/shared)): contratos Zod ↔ Pydantic
- **infra**: Postgres (banco + fila de jobs), Caddy (proxy + HTTPS), Docker Compose

## Pipeline

`ingestão (URL/upload) → fila no Postgres → captura Playwright (desktop+mobile)
→ visão (OpenCV + OCR) → scores de UX → relatório DeepSeek → dashboard + comparação A/B`

## Subir (produção)

```bash
cp .env.example .env   # ajuste os valores
docker compose up -d --build
```

> O primeiro build do worker baixa a imagem do Playwright (~1–2 GB).

## Desenvolvimento (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db worker
npm run db:migrate --workspace @codara-eyes/web
ARTIFACTS_DIR=$(pwd)/.artifacts \
DATABASE_URL=postgres://codara:codara@localhost:5432/codara_eyes \
npm run dev:web
```

## Testes

```bash
npm run typecheck --workspace @codara-eyes/web      # web
cd apps/vision-worker && python -m pytest -q         # worker
```

## Documentação

Visão de produto, arquitetura, pipeline, contratos de dados e deploy em
[docs/](docs/).

## Atualizações

- **2026-06-19** — saliency migrada de OpenCV para **DeepGaze IIE** (treinado em
  eye-tracking) e **scores de UX recalibrados** para a nova distribuição de
  atenção. Alteração feita e deployada **direto na VPS** (deploy ativo roda de
  `/opt/codara-eyes`).
