"""Loop de consumo da fila.

Roda em uma thread daemon dentro do mesmo processo do FastAPI (uvicorn serve
`/health` e este loop processa jobs). Reconecta ao banco em caso de falha e
periodicamente recupera jobs presos.

Fase 1: `_process` apenas simula o pipeline (sleep) e conclui o job. As fases
3-6 substituem o stub por captura, visao, scores e relatorio reais.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from pathlib import Path

import psycopg

from app.capture import capture_url
from app.db import connect
from app.imaging import read_image_size
from app.deepseek import build_payload, generate_report
from app.queue import claim_job, complete_job, fail_job, reap_stuck_jobs
from app.repository import (
    clear_previous_capture,
    get_analysis_input,
    insert_ai_report,
    insert_artifact,
    insert_attention_summary,
    insert_detected_element,
    insert_ux_scores,
    insert_viewport,
)
from app.vision import analyze_viewport

logger = logging.getLogger("vision_worker.worker")


def _guess_mime(path: str) -> str:
    lowered = path.lower()
    if lowered.endswith(".png"):
        return "image/png"
    if lowered.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    return "application/octet-stream"


class JobWorker:
    def __init__(self) -> None:
        self._poll_interval = float(os.environ.get("WORKER_POLL_INTERVAL", "2"))
        self._reap_timeout = float(os.environ.get("WORKER_REAP_TIMEOUT", "120"))
        self._reap_every = float(os.environ.get("WORKER_REAP_EVERY", "30"))
        self._backoff_base = float(os.environ.get("WORKER_BACKOFF_BASE", "30"))
        self._artifacts_dir = Path(os.environ.get("ARTIFACTS_DIR", "/data/artifacts"))
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._last_reap = 0.0

    def start(self) -> None:
        logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="job-worker", daemon=True)
        self._thread.start()
        logger.info("job worker iniciado (poll=%ss)", self._poll_interval)

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=10)
        logger.info("job worker parado")

    def _run(self) -> None:
        conn: psycopg.Connection | None = None
        while not self._stop.is_set():
            try:
                if conn is None or conn.closed:
                    conn = connect()
                    conn.autocommit = True
                did_work = self._tick(conn)
            except Exception:  # noqa: BLE001 - resiliencia: nunca derrubar o loop
                logger.exception("falha no tick do worker; vai reconectar")
                conn = _safe_close(conn)
                self._stop.wait(self._poll_interval)
                continue

            if not did_work:
                self._stop.wait(self._poll_interval)

    def _tick(self, conn: psycopg.Connection) -> bool:
        now = time.monotonic()
        if now - self._last_reap >= self._reap_every:
            reaped = reap_stuck_jobs(conn, self._reap_timeout)
            self._last_reap = now
            if reaped:
                logger.warning("reaper recuperou %s job(s) preso(s)", reaped)

        job = claim_job(conn)
        if job is None:
            return False

        self._process(conn, job)
        return True

    def _process(self, conn: psycopg.Connection, job: dict) -> None:
        logger.info(
            "processando job %s (analysis=%s, tentativa=%s)",
            job["id"],
            job["analysis_id"],
            job["attempts"],
        )
        try:
            analysis_id = job["analysis_id"]
            info = get_analysis_input(conn, analysis_id)
            if info is None:
                raise RuntimeError(f"analise {analysis_id} sem registro de input")

            viewports = self._capture(conn, analysis_id, info)
            analyzed: list[dict] = []
            for viewport in viewports:
                result = self._analyze(conn, analysis_id, viewport)
                analyzed.append(
                    {"type": viewport["type"], "scores": result.scores, "elements": result.elements}
                )
            self._report(conn, analysis_id, info, analyzed)
            complete_job(conn, job)
            logger.info("job %s concluido", job["id"])
        except Exception as exc:  # noqa: BLE001
            logger.exception("job %s falhou", job["id"])
            requeued = fail_job(conn, job, str(exc), self._backoff_base)
            logger.info(
                "job %s %s", job["id"], "reenfileirado" if requeued else "marcado como failed"
            )

    def _capture(self, conn: psycopg.Connection, analysis_id: str, info: dict) -> list[dict]:
        if info["input_type"] == "url":
            url = info["url"]
            if not url:
                raise RuntimeError("input do tipo url sem url")
            # Captura (lenta) fora de transacao; so depois grava no banco.
            results = capture_url(url, self._artifacts_dir, analysis_id)
            viewports: list[dict] = []
            with conn.transaction():
                clear_previous_capture(conn, analysis_id)
                for result in results:
                    viewport_id = insert_viewport(
                        conn, analysis_id, result.viewport_type, result.width, result.height
                    )
                    insert_artifact(
                        conn, analysis_id, viewport_id, "source_screenshot", result.storage_path, "image/png"
                    )
                    viewports.append(
                        {
                            "id": viewport_id,
                            "type": result.viewport_type,
                            "source_path": result.storage_path,
                            "css_width": result.css_width,
                            "dom_elements": result.dom_elements,
                        }
                    )
            logger.info("capturados %s viewport(s) para %s", len(viewports), analysis_id)
            return viewports

        # Upload: a imagem enviada ja e o screenshot de origem (1 viewport).
        path = info["uploaded_file_path"]
        if not path:
            raise RuntimeError("input do tipo image sem arquivo")
        width, height = read_image_size(self._artifacts_dir / path)
        with conn.transaction():
            clear_previous_capture(conn, analysis_id)
            viewport_id = insert_viewport(conn, analysis_id, "desktop", width, height)
            insert_artifact(conn, analysis_id, viewport_id, "source_upload", path, _guess_mime(path))
        logger.info("upload registrado como viewport para %s", analysis_id)
        # Upload nao tem DOM: a analise cai no caminho OCR.
        return [{"id": viewport_id, "type": "desktop", "source_path": path, "css_width": None, "dom_elements": None}]

    def _analyze(self, conn: psycopg.Connection, analysis_id: str, viewport: dict):
        # Visao (lenta) fora de transacao; so depois grava no banco.
        result = analyze_viewport(
            self._artifacts_dir / viewport["source_path"],
            viewport["type"],
            self._artifacts_dir,
            analysis_id,
            dom_elements=viewport.get("dom_elements"),
            css_width=viewport.get("css_width"),
        )
        with conn.transaction():
            insert_artifact(conn, analysis_id, viewport["id"], "normalized", result.normalized_path, "image/png")
            insert_artifact(conn, analysis_id, viewport["id"], "heatmap", result.heatmap_path, "image/png")
            insert_artifact(conn, analysis_id, viewport["id"], "focus_map", result.focus_path, "image/png")
            for element in result.elements:
                insert_detected_element(conn, analysis_id, viewport["id"], element)
            insert_attention_summary(conn, analysis_id, viewport["id"], result.primary_regions, result.gaze_path)
            insert_ux_scores(conn, analysis_id, viewport["id"], result.scores)
        logger.info(
            "viewport %s analisado: %s elemento(s), scores=%s",
            viewport["type"],
            len(result.elements),
            result.scores,
        )
        return result

    def _report(self, conn: psycopg.Connection, analysis_id: str, info: dict, analyzed: list[dict]) -> None:
        # Relatorio nivel-analise (viewport_id nulo). DeepSeek (lento/externo)
        # fora de transacao; so depois grava.
        payload = build_payload(info["page_type"], info["goal"], analyzed)
        report = generate_report(payload)
        with conn.transaction():
            insert_ai_report(conn, analysis_id, None, report)
        logger.info("relatorio (%s) gerado para %s", report["model_name"], analysis_id)


def _safe_close(conn: psycopg.Connection | None) -> None:
    if conn is not None:
        try:
            conn.close()
        except Exception:  # noqa: BLE001
            pass
    return None
