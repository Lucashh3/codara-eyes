# Riscos e Mitigacoes

## Risco 1 - Heatmap com cara de demo
### Descricao
O produto pode parecer superficial se o mapa de atencao nao refletir bem a hierarquia real das telas.

### Mitigacao
- limitar escopo a `landing pages`
- usar modelo preditivo existente antes de pensar em treino proprio
- criar conjunto interno de benchmarking

## Risco 2 - LLM alucinar insights
### Descricao
O `DeepSeek` pode inventar explicacoes sem base suficiente.

### Mitigacao
- usar schema estruturado
- limitar o prompt a fatos e scores
- bloquear respostas excessivamente abertas

## Risco 3 - Complexidade prematura
### Descricao
Adicionar `Figma`, `video` e tracking real cedo demais pode travar a execucao.

### Mitigacao
- congelar v1 em `URL + screenshot`
- tratar `Figma` como v2
- manter apenas `2 apps`

## Risco 4 - Captura inconsistente
### Descricao
Paginas podem renderizar de forma instavel durante o screenshot.

### Mitigacao
- padronizar viewport
- aguardar estado minimo da pagina
- aplicar timeout e fallback

## Risco 5 - Custo operacional crescer cedo
### Descricao
Jobs pesados de imagem e chamadas de IA podem elevar custo.

### Mitigacao
- limitar tamanho de assets
- limitar numero de viewports no MVP
- cachear resultados quando possivel
