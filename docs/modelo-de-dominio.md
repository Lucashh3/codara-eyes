# Modelo de Dominio

## Entidades principais

### users
Representa o usuario autenticado.

Campos principais:
- `id`
- `email`
- `name`
- `created_at`

### projects
Agrupa analises por contexto.

Campos principais:
- `id`
- `user_id`
- `name`
- `description`
- `created_at`

### analyses
Representa uma execucao de analise.

Campos principais:
- `id`
- `project_id`
- `input_type`
- `page_type`
- `status`
- `created_at`
- `completed_at`

### analysis_inputs
Representa a origem da analise.

Campos principais:
- `id`
- `analysis_id`
- `url`
- `uploaded_file_path`
- `source_label`

### viewports
Representa uma variante de renderizacao da mesma analise.

Campos principais:
- `id`
- `analysis_id`
- `type`
- `width`
- `height`

### artifacts
Representa arquivos gerados.

Campos principais:
- `id`
- `analysis_id`
- `viewport_id`
- `artifact_type`
- `storage_path`
- `mime_type`

### detected_elements
Representa elementos detectados na interface.

Campos principais:
- `id`
- `analysis_id`
- `viewport_id`
- `element_type`
- `label`
- `bbox_x`
- `bbox_y`
- `bbox_w`
- `bbox_h`
- `above_fold`
- `contrast_score`

### ux_scores
Representa scores calculados.

Campos principais:
- `id`
- `analysis_id`
- `viewport_id`
- `cta_visibility`
- `headline_attention`
- `visual_hierarchy`
- `attention_competition`
- `above_the_fold_efficiency`
- `clutter_score`

### ai_reports
Representa o relatorio textual gerado.

Campos principais:
- `id`
- `analysis_id`
- `viewport_id`
- `model_name`
- `summary`
- `issues`
- `recommendations`
- `ab_test_hypotheses`

### comparisons
Representa a comparacao entre duas analises.

Campos principais:
- `id`
- `project_id`
- `base_analysis_id`
- `target_analysis_id`
- `summary`
- `delta_scores`

## Relacoes

- `users` 1:N `projects`
- `projects` 1:N `analyses`
- `analyses` 1:N `viewports`
- `analyses` 1:N `artifacts`
- `analyses` 1:N `detected_elements`
- `analyses` 1:N `ux_scores`
- `analyses` 1:N `ai_reports`

## Regras de negocio

- uma analise pode ter mais de um viewport
- cada viewport pode gerar multiplos artifacts
- relatorios devem ser baseados em dados estruturados
- comparacoes devem referenciar duas analises completas
