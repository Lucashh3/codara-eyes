# Deploy e Ambientes

## Objetivo

Subir o Codara Eyes inteiro em uma VPS com `Docker`, sem dependencia de
SaaS externo. O mesmo `docker-compose.yml` roda em local e em producao; o
que muda sao as variaveis no `.env`.

## Pre-requisitos da VPS

- Linux com `Docker` e `docker compose`
- portas `80` e `443` abertas (para o Caddy / HTTPS)
- (producao) um dominio com DNS `A`/`AAAA` apontando para a VPS
- tamanho sugerido: ~`2-4 vCPU` / `4-8 GB` RAM (pipeline e CPU-only)

## Containers

| Servico  | Imagem/Build              | Papel                                   |
|----------|---------------------------|-----------------------------------------|
| `caddy`  | `caddy:2-alpine`          | Proxy reverso + HTTPS automatico        |
| `web`    | `apps/web/Dockerfile`     | UI, API, auth, dono do schema           |
| `worker` | `apps/vision-worker/...`  | Fila + captura + visao + relatorio      |
| `db`     | `postgres:16-alpine`      | Banco + fila de jobs                    |

Volumes persistentes: `pgdata` (banco), `artifacts` (imagens geradas),
`caddy_data`/`caddy_config` (certificados).

## Variaveis de ambiente

Copie o template e ajuste:

```bash
cp .env.example .env
```

Principais variaveis (detalhes em `.env.example`):

- `SITE_ADDRESS`: `localhost` em dev, `eyes.seudominio.com` em producao
- `ACME_EMAIL`: email do Let's Encrypt (so producao)
- `APP_URL`: URL publica da aplicacao
- `AUTH_SECRET`: segredo de sessao (`openssl rand -hex 32`)
- `APP_PASSWORD`: senha unica do login single-tenant
- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`
- `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`

> O `.env` esta no `.gitignore`. Nunca commitar segredos.

## Subir em producao

```bash
# na VPS, dentro do repo
cp .env.example .env      # e edite os valores reais
docker compose up -d --build
```

O `web` roda as migrations no startup. O `caddy` emite o certificado na
primeira requisicao ao dominio configurado em `SITE_ADDRESS`.

Comandos uteis:

```bash
docker compose ps             # status dos containers + healthchecks
docker compose logs -f worker # acompanhar o pipeline
docker compose down           # parar (mantem volumes/dados)
```

## Rodar local (Claude Code)

Com `SITE_ADDRESS=localhost`, o Caddy serve em HTTP simples:

```bash
docker compose up --build
# app em http://localhost
```

### Hot reload (dev)

O `docker-compose.dev.yml` sobe `db` + `worker` (worker com `--reload` e
artifacts no host); o `web` roda local para o hot reload nativo do Next:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db worker
npm run db:migrate --workspace @codara-eyes/web
ARTIFACTS_DIR=$(pwd)/.artifacts \
DATABASE_URL=postgres://codara:codara@localhost:5432/codara_eyes \
npm run dev:web
```

## Backup e restore

Scripts prontos (rodar na raiz, com o stack no ar):

```bash
infra/backup.sh                 # gera backups/<timestamp>/{db.sql,artifacts.tgz}
infra/restore.sh backups/<...>  # restaura banco + artifacts (sobrescreve!)
```

Fazem `pg_dump` do `db` e `tar` do volume `artifacts`. Agende o `backup.sh`
via cron na VPS.

## Orcamento de latencia

Meta do MVP: analise completa em ate ~60s. Knobs (env do `worker`):

- `MAX_FULLPAGE_HEIGHT` (default 12000): corta paginas muito longas para nao
  gerar screenshots gigantes
- `CAPTURE_GOTO_TIMEOUT_MS`, `CAPTURE_NETWORK_IDLE_TIMEOUT_MS`, `CAPTURE_SETTLE_MS`:
  timeouts da captura
- a visao normaliza a imagem para no maximo 1440px de largura

## Saude e observabilidade

- cada servico tem `healthcheck` no compose
- `web`: `GET /api/health`
- `worker`: `GET /health`
- `db`: `pg_isready`
- logs por servico via `docker compose logs -f <servico>`
- metricas minimas: tempo medio de processamento e taxa de falha por etapa

## Ambientes

| Ambiente  | SITE_ADDRESS            | TLS            | Banco              |
|-----------|-------------------------|----------------|--------------------|
| local     | `localhost`             | nao            | Postgres no compose|
| producao  | `eyes.seudominio.com`   | Let's Encrypt  | Postgres no compose|

## Estado do MVP

MVP funcional de ponta a ponta:

- `worker`: fila no Postgres -> captura `Playwright` (desktop + mobile) ->
  motor visual (`OpenCV` saliency + `Tesseract` OCR + deteccao de elementos) ->
  scores de UX -> relatorio com IA (`DeepSeek`, com fallback por regras)
- `web`: login single-tenant, ingestao por URL/upload, dashboard de resultado
  (overlay de heatmap/foco + bounding boxes, scorecards, relatorio, elementos)
  e comparacao A/B entre analises
- endurecimento: override de dev com hot reload, scripts de backup/restore,
  knobs de latencia e testes (pytest) do motor de heuristica

Evolucoes futuras (v2+): tipos de elemento adicionais (nav/form/logo/hero),
saliency por modelo ML, multiusuario, e testes de integracao com o stack no ar.
