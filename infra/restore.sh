#!/usr/bin/env bash
# Restore do backup gerado por infra/backup.sh.
# Uso: infra/restore.sh <diretorio-do-backup>
# ATENCAO: sobrescreve o banco e os artifacts atuais.
set -euo pipefail

DIR="${1:?uso: infra/restore.sh <diretorio-do-backup>}"
VOLUME="${ARTIFACTS_VOLUME:-codara-eyes_artifacts}"
PG_USER="${POSTGRES_USER:-codara}"
PG_DB="${POSTGRES_DB:-codara_eyes}"

echo "==> Restaurando banco a partir de $DIR/db.sql"
docker compose exec -T db psql -U "$PG_USER" "$PG_DB" < "$DIR/db.sql"

echo "==> Restaurando artifacts (volume $VOLUME)"
docker run --rm \
  -v "$VOLUME":/data \
  -v "$(pwd)/$DIR":/backup:ro \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/artifacts.tgz -C /data"

echo "==> Restore concluido."
