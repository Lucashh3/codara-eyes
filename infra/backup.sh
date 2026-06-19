#!/usr/bin/env bash
# Backup do Postgres (pg_dump) + dos artifacts (volume Docker).
# Uso: infra/backup.sh [diretorio-de-saida]
# Rode na raiz do projeto, com o stack no ar (docker compose up -d).
set -euo pipefail

OUT="${1:-backups/$(date +%Y%m%d-%H%M%S)}"
VOLUME="${ARTIFACTS_VOLUME:-codara-eyes_artifacts}"  # <projeto>_<volume>
PG_USER="${POSTGRES_USER:-codara}"
PG_DB="${POSTGRES_DB:-codara_eyes}"

mkdir -p "$OUT"

echo "==> Banco (pg_dump) -> $OUT/db.sql"
docker compose exec -T db pg_dump -U "$PG_USER" "$PG_DB" > "$OUT/db.sql"

echo "==> Artifacts (volume $VOLUME) -> $OUT/artifacts.tgz"
docker run --rm \
  -v "$VOLUME":/data:ro \
  -v "$(pwd)/$OUT":/backup \
  alpine tar czf /backup/artifacts.tgz -C /data .

echo "==> Backup concluido em: $OUT"
