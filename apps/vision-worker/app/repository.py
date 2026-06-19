"""Acesso ao banco para o pipeline do worker.

O worker le `jobs`/`analyses` e escreve nas tabelas de resultado, mas nunca
migra o schema (o dono e o `web`, via Drizzle).
"""

from __future__ import annotations

from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


def get_analysis_input(conn: psycopg.Connection, analysis_id: str) -> dict[str, Any] | None:
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT a.input_type, a.page_type, a.goal, ai.url, ai.uploaded_file_path, ai.source_label "
            "FROM analyses a "
            "LEFT JOIN analysis_inputs ai ON ai.analysis_id = a.id "
            "WHERE a.id = %s",
            (analysis_id,),
        )
        return cur.fetchone()


def clear_previous_capture(conn: psycopg.Connection, analysis_id: str) -> None:
    # Idempotencia em retries: apagar viewports cascateia artifacts/elements.
    # ai_reports e nivel-analise (viewport_id nulo), entao apaga explicitamente.
    with conn.cursor() as cur:
        cur.execute("DELETE FROM viewports WHERE analysis_id = %s", (analysis_id,))
        cur.execute("DELETE FROM ai_reports WHERE analysis_id = %s", (analysis_id,))


def insert_viewport(
    conn: psycopg.Connection,
    analysis_id: str,
    viewport_type: str,
    width: int,
    height: int,
) -> str:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO viewports (analysis_id, type, width, height) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (analysis_id, viewport_type, width, height),
        )
        return cur.fetchone()[0]


def insert_artifact(
    conn: psycopg.Connection,
    analysis_id: str,
    viewport_id: str | None,
    artifact_type: str,
    storage_path: str,
    mime_type: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO artifacts (analysis_id, viewport_id, artifact_type, storage_path, mime_type) "
            "VALUES (%s, %s, %s, %s, %s)",
            (analysis_id, viewport_id, artifact_type, storage_path, mime_type),
        )


def insert_detected_element(
    conn: psycopg.Connection,
    analysis_id: str,
    viewport_id: str,
    element: dict[str, Any],
) -> None:
    x, y, w, h = element["bbox"]
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO detected_elements "
            "(analysis_id, viewport_id, element_type, label, bbox_x, bbox_y, bbox_w, bbox_h, "
            "above_fold, contrast_score, attention_share) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                analysis_id,
                viewport_id,
                element["type"],
                element.get("label"),
                x,
                y,
                w,
                h,
                element["above_fold"],
                element.get("contrast_score"),
                element.get("attention_share"),
            ),
        )


def insert_attention_summary(
    conn: psycopg.Connection,
    analysis_id: str,
    viewport_id: str,
    primary_regions: list[dict[str, Any]],
    gaze_path: list[dict[str, Any]],
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO attention_summaries (analysis_id, viewport_id, primary_regions, gaze_path) "
            "VALUES (%s, %s, %s, %s)",
            (analysis_id, viewport_id, Jsonb(primary_regions), Jsonb(gaze_path)),
        )


def insert_ux_scores(
    conn: psycopg.Connection,
    analysis_id: str,
    viewport_id: str,
    scores: dict[str, float],
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO ux_scores "
            "(analysis_id, viewport_id, cta_visibility, headline_attention, visual_hierarchy, "
            "attention_competition, above_the_fold_efficiency, clutter_score) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (
                analysis_id,
                viewport_id,
                scores["cta_visibility"],
                scores["headline_attention"],
                scores["visual_hierarchy"],
                scores["attention_competition"],
                scores["above_the_fold_efficiency"],
                scores["clutter_score"],
            ),
        )


def insert_ai_report(
    conn: psycopg.Connection,
    analysis_id: str,
    viewport_id: str | None,
    report: dict[str, Any],
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO ai_reports "
            "(analysis_id, viewport_id, model_name, summary, issues, recommendations, ab_test_hypotheses) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (
                analysis_id,
                viewport_id,
                report["model_name"],
                report["summary"],
                Jsonb(report["issues"]),
                Jsonb(report["recommendations"]),
                Jsonb(report["ab_test_hypotheses"]),
            ),
        )
