"""Conexao com o Postgres compartilhado.

Fase 0: apenas wiring e checagem de conectividade. As queries da fila
(consumo de jobs com FOR UPDATE SKIP LOCKED) entram na Fase 1.
"""

from __future__ import annotations

import os

import psycopg


def get_dsn() -> str:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL nao definido")
    return dsn


def connect() -> psycopg.Connection:
    """Abre uma conexao nova. O chamador e responsavel por fechar."""
    return psycopg.connect(get_dsn(), connect_timeout=5)


def db_ok() -> bool:
    """True se o banco responde a um SELECT 1."""
    try:
        with connect() as conn, conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        return True
    except Exception:
        return False
