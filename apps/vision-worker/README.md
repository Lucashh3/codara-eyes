# Vision Worker

Servico Python responsavel por receber imagens, executar o pipeline visual e devolver resultados estruturados para o app web.

## Endpoints iniciais

- `GET /health`
- `POST /analyze-image`
- `POST /generate-heatmap`
- `POST /score-analysis`

## Execucao local

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e apps/vision-worker
uvicorn app.main:app --reload --app-dir apps/vision-worker
```
