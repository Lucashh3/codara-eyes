# Decisoes de Stack

## Stack escolhida

- `Next.js`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`
- `Drizzle ORM`
- `Postgres` (no compose)
- `Caddy` (proxy + HTTPS)
- `Playwright`
- fila no `Postgres` (`FOR UPDATE SKIP LOCKED`)
- `Python`
- `FastAPI`
- `OpenCV` (saliency em CPU)
- `Tesseract` (OCR)
- `DeepSeek V4 API`

> Decisao de plataforma: tudo roda em uma VPS via `docker compose`, sem
> SaaS externo de banco/fila. Ver `docs/arquitetura.md` e
> `docs/deploy-e-ambientes.md`.

## Motivos

### Next.js
Escolhido por:

- alta compatibilidade com geracao por IA
- ecossistema forte
- facilidade para dashboards
- suporte bom a rotas, auth e renderizacao

### Postgres + Drizzle (no lugar do Supabase)
Escolhido por:

- rodar 100% na VPS, sem dependencia de SaaS externo
- `Drizzle` ser leve, SQL-first e facil de manter no `Claude Code`
- o mesmo Postgres servir tambem como fila de jobs
- storage de imagens em volume de disco (sem S3 no MVP)

### Fila no Postgres (no lugar do Trigger.dev/Inngest)
Escolhido por:

- evitar mais um servico (sem Redis, sem SaaS)
- `FOR UPDATE SKIP LOCKED` da consumo seguro e recuperavel a falhas
- funcionar entre Node (escreve) e Python (consome)

### Caddy
Escolhido por:

- HTTPS automatico (Let's Encrypt) com config minima
- proxy reverso simples na frente do `web`

### Playwright
Escolhido por:

- captura confiavel de paginas
- suporte robusto a automacao
- facilidade para configurar viewports

### Python + FastAPI
Escolhido por:

- ecossistema forte para visao computacional
- facil integracao com OCR e modelos
- separacao clara do motor visual

### Visao em CPU (OpenCV + Tesseract, sem PyTorch/GPU no MVP)
Escolhido por:

- rodar em VPS modesta, sem GPU nem pesos de modelo
- saliency classico do `OpenCV` ja gera heatmap util para landing pages
- da para trocar por modelo ML depois sem mudar o contrato de dados

### DeepSeek V4 API
Escolhido por:

- camada de interpretacao e recomendacao
- evita gerenciar inferencia LLM self-hosted na v1
- flexibilidade para gerar relatorios estruturados

## Tradeoffs

### O que ganhamos
- stack enxuta, tudo numa VPS via `docker compose`
- sem dependencia de SaaS para banco, auth, storage e fila
- menor custo operacional inicial
- facilidade para IA desenvolver e manter o codigo

### O que abrimos mao
- HA/escala geridos por terceiros (somos donos do backup e do uptime)
- auth multiusuario no MVP (entra depois)
- qualidade de saliency de modelo ML (CPU classico no MVP)

> Unica dependencia externa que sobra: a API do `DeepSeek` (so uma
> chamada HTTP, sem self-host de LLM).

## O que foi evitado

- microsservicos desde o dia 1
- kubernetes
- Supabase / Trigger.dev / Inngest e outros SaaS de infra
- Redis ou fila dedicada (a fila vive no Postgres)
- GPU e treinamento do zero
- plugin Figma no MVP
