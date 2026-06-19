# Codara Eyes

Plataforma de analise preditiva de atencao visual e suporte a decisoes de UX, inspirada em produtos como VisualEyes e Neurons.

## Objetivo

Permitir que times de produto, design e growth enviem uma `URL` ou `screenshot` e recebam:

- `attention heatmap`
- `focus map`
- `gaze path` estimado
- analise de atencao por elemento
- scorecards de UX
- relatorio interpretativo com IA
- comparacao entre duas versoes

## Escopo inicial

A primeira versao do produto foca em:

- `landing pages de conversao`
- inputs via `URL` e `PNG/JPG`
- analise em `desktop` e `mobile`

## Arquitetura resumida

Roda inteira em uma VPS com `docker compose` (4 containers), sem SaaS externo:

- `caddy`: proxy reverso com HTTPS automatico
- `apps/web`: aplicacao `Next.js` (UI, API, auth, dono do schema)
- `apps/vision-worker`: pipeline `Python` (fila, captura, visao, relatorio)
- `Postgres`: banco + fila de jobs (volume no disco para artifacts)
- `Playwright`: captura automatizada de paginas (dentro do worker)
- `OpenCV` + `Tesseract`: heatmap e OCR em CPU
- `DeepSeek V4`: interpretacao e recomendacoes (unica API externa)

Detalhes em `docs/arquitetura.md` e `docs/deploy-e-ambientes.md`.

## Documentacao

- `docs/escopo-do-produto.md`
- `docs/arquitetura.md`
- `docs/decisoes-de-stack.md`
- `docs/modelo-de-dominio.md`
- `docs/pipeline-de-analise.md`
- `docs/contratos-de-dados.md`
- `docs/backlog.md`
- `docs/criterios-de-aceite-mvp.md`
- `docs/riscos-e-mitigacoes.md`
- `docs/deploy-e-ambientes.md`
- `docs/roadmap-futuro.md`
