# Arquitetura

## Principios

- roda inteira em uma VPS com `Docker`, sem depender de SaaS externo
- minimo de pecas moveis: cada container tem uma responsabilidade obvia
- pipeline orientado a jobs, recuperavel a falhas
- dados estruturados para interpretacao por IA
- simples o suficiente para ser desenvolvida e mantida no `Claude Code`

## Visao geral

Sao `4 containers` orquestrados por um unico `docker-compose.yml`:

- `caddy`: reverse proxy com HTTPS automatico
- `web`: aplicacao `Next.js` (UI, API, auth, dono do schema)
- `worker`: pipeline `Python` (fila, captura, visao, relatorio)
- `db`: `Postgres` (fonte da verdade + fila de jobs)

Storage de imagens fica em um `volume Docker` compartilhado entre `web` e
`worker`. Nao ha Supabase, Trigger.dev/Inngest nem GPU.

```
        Internet
           |
        [caddy]  -- HTTPS automatico (Let's Encrypt)
           |
        [web] ----insere job----> [db: Postgres] <----poll job---- [worker]
           |        le resultado        ^                              |
           |                            |  grava resultado             |
           +--------- volume artifacts (heatmaps, screenshots) --------+
```

## Componentes

### 1. caddy (proxy)
- termina TLS e emite/renova certificado sozinho
- encaminha trafego para o `web`
- config declarativa em `infra/caddy/Caddyfile`

### 2. web (Next.js)
Responsavel por:

- login single-tenant do MVP (um acesso interno)
- criacao de projetos e analises
- upload de screenshot e input de URL
- enfileirar jobs (inserindo linha em `jobs`)
- servir os artifacts do volume
- visualizacao de overlays, scores e relatorios
- comparacao de analises
- **dono do schema e das migrations** (via `Drizzle`)

### 3. worker (Python)
Dono do pipeline de ponta a ponta. Em loop:

- pega o proximo job da fila (`SELECT ... FOR UPDATE SKIP LOCKED`)
- se input for URL, captura `desktop` e `mobile` com `Playwright`
- se input for upload, normaliza a imagem
- gera `heatmap`/`focus map` com saliency do `OpenCV` (CPU)
- extrai texto com `Tesseract` (OCR) e detecta elementos por heuristica
- agrega atencao por elemento e calcula os scores de UX
- chama o `DeepSeek` para o relatorio interpretativo
- salva artifacts no volume e grava o resultado no `Postgres`
- expoe `/health` para o healthcheck

O worker **le `jobs` e escreve nas tabelas de resultado, mas nunca migra**:
o schema pertence ao `web`.

### 4. db (Postgres)
- guarda projetos, analises, elementos, scores, relatorios e comparacoes
- serve tambem como fila de jobs (tabela `jobs`)
- persistencia em volume `pgdata`

## Fila de jobs (sem Redis, sem SaaS)

A fila vive no proprio Postgres, o que evita um servico extra e funciona
entre Node (escreve) e Python (consome):

1. o `web` insere `job (status=queued)` ao criar a analise
2. o `worker` consome com `FOR UPDATE SKIP LOCKED` (sem corrida entre workers)
3. ao terminar, marca `done`; em erro, incrementa `attempts` e reenfileira
4. um *reaper* devolve a fila jobs presos em `processing` alem de um timeout

Isso atende o criterio do MVP de "jobs recuperaveis em caso de falha".

## Fluxo macro

1. usuario cria uma analise (URL ou screenshot)
2. `web` grava a analise (`pending`) e insere um job (`queued`)
3. `worker` pega o job e captura/normaliza a imagem
4. `worker` roda visao, scores e relatorio com IA
5. artifacts vao para o volume; resultado vai para o Postgres (`completed`)
6. a UI faz polling do status e exibe mapas, scores e insights

## Persistencia

### Banco (Postgres)
- projetos, analises, status
- elementos detectados, scores
- relatorios, comparacoes
- fila de jobs

### Storage (volume `artifacts`)
- screenshots originais e normalizados
- heatmaps e focus maps
- artefatos auxiliares

## Decisoes de simplicidade (para VPS + IA)

- **visao em CPU**: saliency do `OpenCV` + `Tesseract`, sem `PyTorch`/GPU.
  Roda em VPS modesta (~2-4 vCPU / 4-8 GB). Da para trocar por modelo ML
  depois sem mudar o contrato de dados.
- **captura + visao + relatorio no mesmo worker**: um unico dono do pipeline.
- **fila no Postgres**: zero infra extra de fila.
- **auth single-tenant**: um login interno no MVP; multiusuario entra depois
  sem retrabalho de schema.

## Topologia de codigo

- `apps/web`
- `apps/vision-worker`
- `packages/shared` (contratos `Zod` <-> `Pydantic`)
- `infra/caddy` (Caddyfile)

Os contratos compartilhados continuam sendo a fonte da verdade do formato
trocado entre `web` e `worker`.
