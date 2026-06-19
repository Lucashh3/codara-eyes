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

# Modelo de saliency DeepGaze IIE (treinado em eye-tracking) — CPU.
# torch/torchvision vem do indice CPU-only (sem libs CUDA). clip/einops/timm
# sao deps de import do pacote deepgaze_pytorch (mesmo sem usar aqueles modelos).
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir scipy ftfy regex tqdm einops timm \
        "git+https://github.com/openai/CLIP.git" \
        "git+https://github.com/matthias-k/DeepGaze.git"

# Pre-baixa os pesos do DeepGaze IIE para dentro da imagem (runtime sem rede).
RUN python -c "import torch; torch.set_num_threads(1); import deepgaze_pytorch; deepgaze_pytorch.DeepGazeIIE(pretrained=True); print('DeepGaze IIE weights cached')"

COPY apps/vision-worker /app

RUN pip install --no-cache-dir .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${VISION_WORKER_PORT}"]
