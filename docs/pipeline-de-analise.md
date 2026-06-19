# Pipeline de Analise

## Objetivo

Transformar uma `URL` ou `screenshot` em um conjunto de outputs visuais e textuais acionaveis.

## Etapas

### 1. Ingestao
Entrada suportada:

- URL
- screenshot

Saidas:
- registro de analise
- artifact inicial salvo
- status `pending`

### 2. Captura
Se o input for URL:

- abrir pagina em `desktop`
- abrir pagina em `mobile`
- aguardar estado minimo de estabilidade
- capturar screenshot
- salvar artifact

### 3. Normalizacao
- resize controlado
- padronizacao de formato
- remocao de areas irrelevantes se necessario
- geracao da versao normalizada

### 4. Entendimento da UI
- OCR para textos
- deteccao de blocos
- identificacao de `headline`
- identificacao de `CTA`
- identificacao de `form`
- identificacao de `nav`
- identificacao de `hero image`
- calculo de bbox e sinais visuais

### 5. Predicao de Atencao
- executar modelo de saliency
- gerar `attention heatmap`
- gerar `focus map`
- estimar ordem inicial de atencao
- agregar distribuicao por regioes

### 6. Agregacao por Elemento
- cruzar mapa de atencao com `detected_elements`
- calcular share de atencao por elemento
- identificar competencia visual entre elementos

### 7. Scoring
Calcular:
- `cta_visibility`
- `headline_attention`
- `visual_hierarchy`
- `attention_competition`
- `above_the_fold_efficiency`
- `clutter_score`

### 8. Relatorio com IA
Enviar ao `DeepSeek V4`:
- tipo da pagina
- contexto da analise
- elementos detectados
- shares de atencao
- scores

Receber:
- resumo executivo
- problemas prioritarios
- recomendacoes
- hipoteses de teste

### 9. Persistencia e exibicao
- salvar JSON final
- salvar relatorio
- disponibilizar dashboard para consulta

## Requisitos de qualidade
- analise completa em ate 60 segundos
- suporte consistente a desktop e mobile
- schema padrao entre os modulos
