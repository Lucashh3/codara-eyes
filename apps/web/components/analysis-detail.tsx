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
  cta: "oklch(55% 0.16 25)",
  headline: "oklch(50% 0.14 145)",
  subheadline: "oklch(60% 0.14 85)",
};
const ELEMENT_BADGE: Record<string, string> = {
  headline: "bg-[oklch(92%_0.06_145)] text-[oklch(50%_0.14_145)]",
  subheadline: "bg-[oklch(92%_0.06_85)] text-[oklch(50%_0.14_85)]",
  cta: "bg-[oklch(92%_0.06_25)] text-[oklch(55%_0.16_25)]",
  other: "bg-[color:var(--background)] text-[color:var(--muted)]",
};

function BackButton() {
  return (
    <Link
      href="/"
      aria-label="Voltar ao painel"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--border)] text-[color:var(--muted)] transition-colors hover:border-[color:var(--foreground)] hover:text-[color:var(--foreground)]"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </Link>
  );
}

function HeaderBar({ children }: { children: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-3">
      {children}
    </header>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">{children}</section>
  );
}

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
      <div className="flex min-h-dvh flex-col">
        <HeaderBar>
          <BackButton />
        </HeaderBar>
        <main className="mx-auto w-full max-w-[1400px] p-6">
          <Section>
            <p className="text-base font-semibold">Analise nao encontrada.</p>
          </Section>
        </main>
      </div>
    );
  }

  if (!loaded || !data) {
    return (
      <div className="flex min-h-dvh flex-col">
        <HeaderBar>
          <BackButton />
        </HeaderBar>
        <main className="mx-auto w-full max-w-[1400px] p-6">
          <p className="text-sm text-[color:var(--muted)]">Carregando...</p>
        </main>
      </div>
    );
  }

  const { analysis, report, viewports } = data;
  const title = analysis.sourceLabel || analysis.url || "Upload de imagem";
  const viewport = viewports[viewportIndex] ?? viewports[0];

  const availableLayers = viewport ? LAYER_ORDER.filter((key) => viewport.artifacts[key]) : [];
  const activeLayer = availableLayers.includes(layer) ? layer : availableLayers[0];
  const imageUrl = viewport && activeLayer ? viewport.artifacts[activeLayer] : undefined;
  const boxesVisible = showBoxes && activeLayer !== "source";

  return (
    <div className="flex min-h-dvh flex-col">
      <HeaderBar>
        <div className="flex min-w-0 items-center gap-4">
          <BackButton />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="truncate text-xl font-semibold">{title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-[color:var(--background)] px-1.5 py-0.5 text-[11px] text-[color:var(--muted)]">
                {analysis.pageType}
              </span>
              <span className="rounded bg-[color:var(--background)] px-1.5 py-0.5 text-[11px] text-[color:var(--muted)]">
                {analysis.goal}
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--muted)]">
                {new Date(analysis.createdAt).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        </div>
        <StatusBadge status={analysis.status} />
      </HeaderBar>

      <main className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
        {analysis.status === "failed" ? (
          <Section>
            <p className="text-base font-semibold text-[color:var(--danger)]">A analise falhou.</p>
            {analysis.error ? <p className="mt-2 text-sm text-[color:var(--muted)]">{analysis.error}</p> : null}
          </Section>
        ) : analysis.status !== "completed" ? (
          <Section>
            <p className="text-base font-semibold">Analise em andamento</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
              Os mapas de atencao, scores e o relatorio aparecem aqui assim que o processamento terminar. A pagina
              atualiza sozinha.
            </p>
          </Section>
        ) : (
          <>
            {report ? (
              <Section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    Relatório com IA
                    <span className="rounded bg-[color:var(--background)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--muted)]">
                      {report.modelName}
                    </span>
                  </h2>
                </div>
                <p className="mb-6 leading-relaxed text-[color:var(--muted)]">{report.summary}</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <ReportCard
                    tone="text-[color:var(--danger)]"
                    title="Problemas Prioritários"
                    items={report.issues}
                  />
                  <ReportCard
                    tone="text-[color:var(--accent)]"
                    title="Recomendações"
                    items={report.recommendations}
                  />
                  <ReportCard
                    tone="text-[oklch(55%_0.14_280)]"
                    title="Hipóteses de Teste A/B"
                    items={report.abTestHypotheses}
                  />
                </div>
              </Section>
            ) : null}

            {viewports.length > 1 ? (
              <div className="inline-flex rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-1" role="tablist" aria-label="Viewport">
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
                    className={`rounded-md px-4 py-2 text-[13px] font-medium transition-colors ${
                      index === viewportIndex
                        ? "bg-[color:var(--accent)] text-white"
                        : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                    }`}
                  >
                    {vp.type === "mobile" ? "Mobile" : "Desktop"}
                  </button>
                ))}
              </div>
            ) : null}

            {viewport ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                {/* Imagem + overlay */}
                <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
                  <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3">
                    <div className="flex flex-wrap gap-1" role="group" aria-label="Camada">
                      {availableLayers.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setLayer(key)}
                          aria-pressed={key === activeLayer}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            key === activeLayer
                              ? "border-[color:var(--foreground)] bg-[color:var(--foreground)] text-[color:var(--surface)]"
                              : "border-[color:var(--border)] text-[color:var(--muted)] hover:border-[color:var(--foreground)]"
                          }`}
                        >
                          {LAYER_LABELS[key] ?? key}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showBoxes}
                      onClick={() => setShowBoxes((value) => !value)}
                      className="flex items-center gap-2 text-xs text-[color:var(--muted)]"
                    >
                      <span>Elementos</span>
                      <span
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          showBoxes ? "bg-[color:var(--accent)]" : "bg-[color:var(--border)]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                            showBoxes ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                    </button>
                  </div>

                  <div className="relative bg-[color:var(--background)]">
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
                                className="pointer-events-none absolute rounded border-2"
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
                </div>

                {/* Scorecard */}
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
                  <h3 className="mb-4 text-base font-semibold">Scorecard de UX</h3>
                  {viewport.scores ? (
                    <div className="flex flex-col gap-3">
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
                    <p className="text-sm text-[color:var(--muted)]">Scores indisponiveis.</p>
                  )}
                </div>
              </div>
            ) : null}

            {viewport && viewport.elements.length > 0 ? (
              <Section>
                <h3 className="mb-4 text-base font-semibold">Elementos Detectados</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="border-b border-[color:var(--border)] px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[color:var(--muted)]">
                          Tipo
                        </th>
                        <th className="border-b border-[color:var(--border)] px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[color:var(--muted)]">
                          Conteúdo
                        </th>
                        <th className="border-b border-[color:var(--border)] px-3 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[color:var(--muted)]">
                          Share de Atenção
                        </th>
                        <th className="border-b border-[color:var(--border)] px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[color:var(--muted)]">
                          Posição
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewport.elements.map((element, index) => {
                        const badge = ELEMENT_BADGE[element.elementType] ?? ELEMENT_BADGE.other;
                        return (
                          <tr key={index}>
                            <td className="border-b border-[color:var(--border)] px-3 py-2.5">
                              <span
                                className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium uppercase ${badge}`}
                              >
                                {ELEMENT_LABELS[element.elementType] ?? element.elementType}
                              </span>
                            </td>
                            <td className="border-b border-[color:var(--border)] px-3 py-2.5 text-[color:var(--muted)]">
                              {element.label || "—"}
                            </td>
                            <td className="border-b border-[color:var(--border)] px-3 py-2.5 text-right font-[family-name:var(--font-mono)] tabular-nums">
                              {Math.round((element.attentionShare ?? 0) * 100)}%
                            </td>
                            <td className="border-b border-[color:var(--border)] px-3 py-2.5">
                              {element.aboveFold ? (
                                <span className="rounded bg-[color:var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[color:var(--accent)]">
                                  Above fold
                                </span>
                              ) : (
                                <span className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[10px] text-[color:var(--muted)]">
                                  Below fold
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function ReportCard({ tone, title, items }: { tone: string; title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-[color:var(--background)] p-4">
      <h3 className={`mb-3 text-xs font-semibold uppercase tracking-[0.05em] ${tone}`}>{title}</h3>
      {items.length > 0 ? (
        <ul className="m-0 list-none p-0">
          {items.map((item, index) => (
            <li
              key={index}
              className="border-b border-[color:var(--border)] py-2 text-[13px] leading-relaxed last:border-b-0"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-[color:var(--muted)]">—</p>
      )}
    </div>
  );
}
