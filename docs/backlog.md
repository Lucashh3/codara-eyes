# Backlog

## Epico 1 - Fundacao do produto
### Objetivo
Criar a base do sistema.

### Itens
- setup do monorepo
- configuracao do `apps/web`
- configuracao do `Supabase`
- autenticacao
- entidades iniciais
- dashboard vazio

## Epico 2 - Ingestao de analises
### Objetivo
Permitir criar analises por URL ou screenshot.

### Itens
- formulario de nova analise
- upload de imagem
- input por URL
- persistencia da analise
- status inicial

## Epico 3 - Captura de paginas
### Objetivo
Gerar screenshots automaticos multi-viewport.

### Itens
- integracao com `Playwright`
- presets desktop e mobile
- captura estavel
- upload de artifacts

## Epico 4 - Motor visual
### Objetivo
Produzir mapas e entendimento de layout.

### Itens
- worker Python
- preprocessamento de imagem
- OCR
- deteccao de elementos
- geracao de heatmap
- focus map

## Epico 5 - Scores de UX
### Objetivo
Transformar sinais visuais em metricas.

### Itens
- calculo de `cta_visibility`
- calculo de `headline_attention`
- calculo de `visual_hierarchy`
- calculo de `clutter_score`

## Epico 6 - Relatorio com IA
### Objetivo
Gerar insights acionaveis.

### Itens
- schema de entrada para `DeepSeek`
- prompts estruturados
- persistencia de relatorio
- renderizacao na UI

## Epico 7 - Comparacao A/B
### Objetivo
Comparar duas versoes.

### Itens
- tela de comparacao
- delta de scores
- delta de atencao por elemento
- resumo comparativo

## Sugestao de sprints

### Sprint 1
- fundacao
- auth
- projetos
- analises

### Sprint 2
- ingestao URL
- ingestao screenshot
- estado de jobs

### Sprint 3
- captura via `Playwright`
- storage de artifacts

### Sprint 4
- worker visual
- primeiro heatmap

### Sprint 5
- deteccao de elementos
- scores

### Sprint 6
- integracao `DeepSeek`
- relatorio

### Sprint 7
- comparacao A/B
- refinamentos
