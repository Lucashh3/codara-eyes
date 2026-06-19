"use client";

import type { AnalysisStatus } from "@codara-eyes/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SCORE_META } from "../lib/scores";
import { ScoreCard } from "./score-card";
import { StatusBadge } from "./status-badge";

type Bbox = { x: number; y: number; w: number; h: number };
type Element = {
  elementType: string;
  label: string | null;
  bbox: Bbox;
  aboveFold: boolean;
  contrastScore: number | null;
  attentionShare: number | null;
};
type Viewport = {
  id: string;
  type: string;
  width: number;
  height: number;
  scores: Record<string, number> | null;
  elements: Element[];
  artifacts: Record<string, string>;
};
type Report = {
  modelName: string;
  summary: string;
  issues: string[];
  recommendations: string[];
  abTestHypotheses: string[];
};
type Analysis = {
  id: string;
  status: AnalysisStatus;
  pageType: string;
  goal: string;
  error: string | null;
  createdAt: string;
  url: string | null;
  sourceLabel: string | null;
};
type Payload = { analysis: Analysis; report: Report | null; viewports: Viewport[] };

const TERMINAL: AnalysisStatus[] = ["completed", "failed"];

const LAYER_LABELS: Record<string, string> = {
  heatmap: "Heatmap",
  focus_map: "Foco",
  normalized: "Original",
  source: "Captura",
};
const LAYER_ORDER = ["heatmap", "focus_map", "normalized", "source"];

const ELEMENT_LABELS: Record<string, string> = {
  headline: "Headline",
  subheadline: "Subheadline",
  cta: "CTA",
  text_block: "Bloco de texto",
};
const ELEMENT_COLORS: Record<string, string> = {
  cta: "var(--accent-strong)",
  headline: "var(--success)",
  subheadline: "var(--accent)",
};

export function AnalysisDetail({ id }: { id: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [viewportIndex, setViewportIndex] = useState(0);
  const [layer, setLayer] = useState("heatmap");
  const [showBoxes, setShowBoxes] = useState(true);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/analyses/${id}`, { cache: "no-store" });
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      if (!response.ok) return;
      const json = await response.json();
      setData({ analysis: json.analysis, report: json.report, viewports: json.viewports });
    } catch {
      // proximo poll tenta de novo
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      setData((current) => {
        if (current && TERMINAL.includes(current.analysis.status)) return current;
        load();
        return current;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [load]);

  if (notFound) {
    return (
      <BackShell>
        <p className="text-base font-semibold">Analise nao encontrada.</p>
      </BackShell>
    );
  }

  if (!loaded || !data) {
    return (
      <BackShell>
        <p className="text-sm text-[color:var(--muted)]">Carregando...</p>
      </BackShell>
    );
  }

  const { analysis, report, viewports } = data;
  const title = analysis.sourceLabel || analysis.url || "Upload de imagem";
  const viewport = viewports[viewportIndex] ?? viewports[0];

  const availableLayers = viewport
    ? LAYER_ORDER.filter((key) => viewport.artifacts[key])
    : [];
  const activeLayer = availableLayers.includes(layer) ? layer : availableLayers[0];
  const imageUrl = viewport && activeLayer ? viewport.artifacts[activeLayer] : undefined;
  const boxesVisible = showBoxes && activeLayer !== "source";

  return (
    <div className="mt-8 space-y-6">
      <div>
        <Link href="/" className="text-sm text-[color:var(--muted)] hover:text-[var(--foreground)]">
          ← Painel
        </Link>
      </div>

      <header className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(57,40,27,0.08)] backdrop-blur md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold leading-tight md:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {analysis.pageType} · {analysis.goal} ·{" "}
              <span className="tabular-nums">{new Date(analysis.createdAt).toLocaleString("pt-BR")}</span>
            </p>
          </div>
          <StatusBadge status={analysis.status} />
        </div>
      </header>

      {analysis.status === "failed" ? (
        <Card>
          <p className="text-base font-semibold text-[color:var(--danger)]">A analise falhou.</p>
          {analysis.error ? (
            <p className="mt-2 text-sm text-[color:var(--muted)]">{analysis.error}</p>
          ) : null}
        </Card>
      ) : analysis.status !== "completed" ? (
        <Card>
          <p className="text-base font-semibold">Analise em andamento</p>
          <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
            Os mapas de atencao, scores e o relatorio aparecem aqui assim que o processamento terminar.
            A pagina atualiza sozinha.
          </p>
        </Card>
      ) : (
        <>
          {report ? (
            <Card>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
                  Relatorio
                </p>
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-[color:var(--muted)]">
                  {report.modelName}
                </span>
              </div>
              <p className="mt-3 text-base leading-8">{report.summary}</p>
              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <ReportList title="Problemas prioritarios" items={report.issues} />
                <ReportList title="Recomendacoes" items={report.recommendations} />
                <ReportList title="Hipoteses de teste" items={report.abTestHypotheses} />
              </div>
            </Card>
          ) : null}

          {viewports.length > 1 ? (
            <div className="flex gap-2" role="tablist" aria-label="Viewport">
              {viewports.map((vp, index) => (
                <button
                  key={vp.id}
                  type="button"
                  role="tab"
                  aria-selected={index === viewportIndex}
                  onClick={() => {
                    setViewportIndex(index);
                    setImgSize(null);
                  }}
                  className={`min-h-11 rounded-full border px-5 text-sm font-medium ${
                    index === viewportIndex
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)]/12 text-[color:var(--accent-strong)]"
                      : "border-[color:var(--border)] bg-white/60 text-[color:var(--muted)]"
                  }`}
                >
                  {vp.type === "mobile" ? "Mobile" : "Desktop"}
                </button>
              ))}
            </div>
          ) : null}

          {viewport ? (
            <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              {/* Imagem + overlay */}
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Camada">
                    {availableLayers.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setLayer(key)}
                        aria-pressed={key === activeLayer}
                        className={`min-h-9 rounded-full px-4 text-xs font-semibold ${
                          key === activeLayer
                            ? "bg-[color:var(--accent-strong)] text-white"
                            : "bg-black/5 text-[color:var(--muted)]"
                        }`}
                      >
                        {LAYER_LABELS[key] ?? key}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                    <input
                      type="checkbox"
                      checked={showBoxes}
                      onChange={(event) => setShowBoxes(event.target.checked)}
                    />
                    Elementos
                  </label>
                </div>

                <div className="relative mt-4 overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-black/5">
                  {imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={`${activeLayer} do viewport ${viewport.type}`}
                        className="block w-full"
                        onLoad={(event) =>
                          setImgSize({
                            w: event.currentTarget.naturalWidth,
                            h: event.currentTarget.naturalHeight,
                          })
                        }
                      />
                      {boxesVisible && imgSize
                        ? viewport.elements.map((element, index) => (
                            <span
                              key={index}
                              title={`${ELEMENT_LABELS[element.elementType] ?? element.elementType}${
                                element.label ? `: ${element.label}` : ""
                              }`}
                              className="pointer-events-none absolute rounded-sm border-2"
                              style={{
                                left: `${(element.bbox.x / imgSize.w) * 100}%`,
                                top: `${(element.bbox.y / imgSize.h) * 100}%`,
                                width: `${(element.bbox.w / imgSize.w) * 100}%`,
                                height: `${(element.bbox.h / imgSize.h) * 100}%`,
                                borderColor: ELEMENT_COLORS[element.elementType] ?? "var(--muted)",
                              }}
                            />
                          ))
                        : null}
                    </>
                  ) : (
                    <p className="p-8 text-sm text-[color:var(--muted)]">Imagem indisponivel.</p>
                  )}
                </div>
              </Card>

              {/* Scores */}
              <Card>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
                  Scores de UX
                </p>
                {viewport.scores ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {SCORE_META.map((meta) => (
                      <ScoreCard
                        key={meta.key}
                        label={meta.label}
                        value={viewport.scores?.[meta.key] ?? 0}
                        betterHigh={meta.betterHigh}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[color:var(--muted)]">Scores indisponiveis.</p>
                )}
              </Card>
            </div>
          ) : null}

          {viewport && viewport.elements.length > 0 ? (
            <Card>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
                Elementos detectados
              </p>
              <ul className="mt-4 space-y-2">
                {viewport.elements.map((element, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-[16px] border border-[color:var(--border)] bg-white/60 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {ELEMENT_LABELS[element.elementType] ?? element.elementType}
                      </p>
                      {element.label ? (
                        <p className="truncate text-xs text-[color:var(--muted)]">{element.label}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-[color:var(--muted)]">
                      <span className="tabular-nums">
                        {Math.round((element.attentionShare ?? 0) * 100)}% atencao
                      </span>
                      {element.aboveFold ? (
                        <span className="rounded-full bg-[color:var(--success)]/12 px-2 py-0.5 text-[color:var(--success)]">
                          above-fold
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <article className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(57,40,27,0.08)] backdrop-blur md:p-7">
      {children}
    </article>
  );
}

function BackShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 space-y-6">
      <Link href="/" className="text-sm text-[color:var(--muted)] hover:text-[var(--foreground)]">
        ← Painel
      </Link>
      <Card>{children}</Card>
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2 text-sm leading-6 text-[color:var(--muted)]">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2">
              <span aria-hidden="true" className="text-[color:var(--accent-strong)]">
                •
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[color:var(--muted)]">—</p>
      )}
    </div>
  );
}
