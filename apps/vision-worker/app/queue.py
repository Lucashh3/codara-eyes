"""Mecanica da fila de jobs sobre o Postgres.

O consumo usa `FOR UPDATE SKIP LOCKED` dentro de um unico UPDATE, o que torna
o claim atomico e seguro entre varios workers. Transicoes de status do job
tambem refletem no status da `analysis` correspondente.
"""

from __future__ import annotations

from typing import Any

import psycopg
from psycopg.rows import dict_row

Job = dict[str, Any]

_CLAIM_SQL = """
WITH next AS (
    SELECT id
    FROM jobs
    WHERE status = 'queued' AND run_after <= now()
    ORDER BY run_after
    FOR UPDATE SKIP LOCKED
    LIMIT 1
)
UPDATE jobs j
SET status = 'processing',
    locked_at = now(),
    attempts = attempts + 1,
    updated_at = now()
FROM next
WHERE j.id = next.id
RETURNING j.id, j.analysis_id, j.type, j.attempts, j.max_attempts
"""


def claim_job(conn: psycopg.Connection) -> Job | None:
    """Reserva o proximo job pronto. Retorna None se a fila estiver vazia."""
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(_CLAIM_SQL)
        job = cur.fetchone()
    if job is not None:
        # Reflete o estado no nivel da analise (best-effort, fora do claim).
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE analyses SET status = 'processing' "
                "WHERE id = %s AND status NOT IN ('completed', 'failed')",
                (job["analysis_id"],),
            )
    return job


def complete_job(conn: psycopg.Connection, job: Job) -> None:
    """Marca o job como concluido e a analise como completed."""
    with conn.transaction(), conn.cursor() as cur:
        cur.execute(
            "UPDATE jobs SET status = 'done', last_error = NULL, updated_at = now() "
            "WHERE id = %s",
            (job["id"],),
        )
        cur.execute(
            "UPDATE analyses SET status = 'completed', completed_at = now() WHERE id = %s",
            (job["analysis_id"],),
        )


def fail_job(
    conn: psycopg.Connection,
    job: Job,
    error: str,
    backoff_base_seconds: float,
) -> bool:
    """Trata a falha de um job.

    Reenfileira com backoff enquanto houver tentativas; caso contrario marca o
    job e a analise como `failed`. Retorna True se reenfileirou.
    """
    requeued = job["attempts"] < job["max_attempts"]
    with conn.transaction(), conn.cursor() as cur:
        if requeued:
            backoff = int(backoff_base_seconds * job["attempts"])
            cur.execute(
                "UPDATE jobs SET status = 'queued', "
                "run_after = now() + (%s * interval '1 second'), "
                "locked_at = NULL, last_error = %s, updated_at = now() WHERE id = %s",
                (backoff, error, job["id"]),
            )
        else:
            cur.execute(
                "UPDATE jobs SET status = 'failed', last_error = %s, updated_at = now() "
                "WHERE id = %s",
                (error, job["id"]),
            )
            cur.execute(
                "UPDATE analyses SET status = 'failed', error = %s WHERE id = %s",
                (error, job["analysis_id"]),
            )
    return requeued


def reap_stuck_jobs(conn: psycopg.Connection, timeout_seconds: float) -> int:
    """Recupera jobs presos em `processing` (worker que caiu durante o job).

    Reenfileira se ainda houver tentativas; senao marca como `failed`.
    Retorna quantos jobs foram recuperados.
    """
    with conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "UPDATE jobs SET "
            "status = CASE WHEN attempts < max_attempts THEN 'queued' ELSE 'failed' END, "
            "run_after = now(), locked_at = NULL, "
            "last_error = 'reaped: preso em processing', updated_at = now() "
            "WHERE status = 'processing' AND locked_at < now() - (%s * interval '1 second') "
            "RETURNING id, analysis_id, status",
            (int(timeout_seconds),),
        )
        reaped = cur.fetchall()
        failed_analysis_ids = [r["analysis_id"] for r in reaped if r["status"] == "failed"]
        if failed_analysis_ids:
            cur.execute(
                "UPDATE analyses SET status = 'failed', "
                "error = 'reaped: preso em processing' "
                "WHERE id = ANY(%s) AND status NOT IN ('completed', 'failed')",
                (failed_analysis_ids,),
            )
    return len(reaped)
