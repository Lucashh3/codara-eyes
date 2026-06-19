# Imagem oficial do Playwright (Python 3 + Chromium + libs do SO ja instalados).
# A tag deve casar com a versao do pacote playwright no pyproject (1.48.0).
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV VISION_WORKER_PORT=8000

# Tesseract (OCR) com idiomas pt + en.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-por tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

COPY apps/vision-worker /app

RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${VISION_WORKER_PORT}"]
