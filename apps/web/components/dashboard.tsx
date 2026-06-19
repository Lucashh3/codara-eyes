"use client";

import {
  analysisGoalOptions,
  pageTypeOptions,
  type AnalysisGoal,
  type AnalysisStatus,
  type InputType,
  type PageType,
} from "@codara-eyes/shared";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { StatusBadge } from "./status-badge";

type AnalysisRow = {
  id: string;
  status: AnalysisStatus;
  inputType: InputType;
  pageType: PageType;
  goal: AnalysisGoal;
  error: string | null;
  createdAt: string;
  url: string | null;
  sourceLabel: string | null;
};

const PAGE_TYPE_LABELS: Record<PageType, string> = {
  landing_page: "Landing page",
  homepage: "Homepage",
  waitlist: "Waitlist",
  lead_capture: "Captura de leads",
};

const GOAL_LABELS: Record<AnalysisGoal, string> = {
  lead_generation: "Geracao de leads",
  click_through: "Click-through",
  sign_up: "Cadastro",
  awareness: "Awareness",
};

const TERMINAL: AnalysisStatus[] = ["completed", "failed"];
const POLL_MS = 4000;

const fieldClasses =
  "min-h-11 w-full rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 text-base text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]";

export function Dashboard() {
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [inputType, setInputType] = useState<InputType>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pageType, setPageType] = useState<PageType>("landing_page");
  const [goal, setGoal] = useState<AnalysisGoal>("lead_generation");
  const [sourceLabel, setSourceLabel] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAnalyses = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/analyses", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setAnalyses(data.analyses ?? []);
    } catch {
      // silencioso: o proximo poll tenta de novo
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadAnalyses();
    const timer = setInterval(loadAnalyses, POLL_MS);
    return () => clearInterval(timer);
  }, [loadAnalyses]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (inputType === "url" && !url.trim()) {
      setFormError("Informe a URL da pagina.");
      return;
    }
    if (inputType === "image" && !file) {
      setFormError("Selecione um arquivo PNG ou JPG.");
      return;
    }

    setSubmitting(true);
    try {
      let uploadedFilePath: string | undefined;

      if (inputType === "image" && file) {
        const form = new FormData();
        form.append("file", file);
        const uploadResponse = await fetch("/api/uploads", { method: "POST", body: form });
        const uploadData = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok) {
          setFormError(uploadData?.error ?? "Falha no upload do arquivo.");
          return;
        }
        uploadedFilePath = uploadData.path;
      }

      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType,
          pageType,
          goal,
          sourceLabel: sourceLabel.trim() || undefined,
          url: inputType === "url" ? url.trim() : undefined,
          uploadedFilePath,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setFormError(data?.error ?? "Nao foi possivel criar a analise.");
        return;
      }

      setFormSuccess("Analise criada e enfileirada.");
      setUrl("");
      setFile(null);
      setSourceLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadAnalyses();
    } catch {
      setFormError("Falha de conexao. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasActive = analyses.some((item) => !TERMINAL.includes(item.status));

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      {/* Formulario de nova analise */}
      <article className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(57,40,27,0.08)] backdrop-blur md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">Nova analise</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight">Enviar pagina para analise</h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <fieldset>
            <legend className="text-sm font-semibold">Origem</legend>
            <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de entrada">
              {(["url", "image"] as const).map((option) => {
                const active = inputType === option;
                return (
                  <label
                    key={option}
                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border px-4 text-sm font-medium transition-colors ${
                      active
                        ? "border-[color:var(--accent)] bg-[color:var(--accent)]/12 text-[color:var(--accent-strong)]"
                        : "border-[color:var(--border)] bg-white/60 text-[color:var(--muted)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="inputType"
                      value={option}
                      checked={active}
                      onChange={() => setInputType(option)}
                      className="sr-only"
                    />
                    {option === "url" ? "URL" : "Imagem (PNG/JPG)"}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {inputType === "url" ? (
            <div>
              <label htmlFor="url" className="block text-sm font-semibold">
                URL da pagina <span className="text-[color:var(--accent-strong)]">*</span>
              </label>
              <input
                id="url"
                type="url"
                inputMode="url"
                placeholder="https://exemplo.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className={`mt-2 ${fieldClasses}`}
              />
              <p className="mt-1.5 text-xs text-[color:var(--muted)]">Capturamos desktop e mobile automaticamente.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="file" className="block text-sm font-semibold">
                Arquivo PNG/JPG <span className="text-[color:var(--accent-strong)]">*</span>
              </label>
              <input
                id="file"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-sm text-[color:var(--muted)] file:mr-4 file:min-h-11 file:rounded-2xl file:border-0 file:bg-[color:var(--accent-strong)] file:px-5 file:text-sm file:font-semibold file:text-white"
              />
              <p className="mt-1.5 text-xs text-[color:var(--muted)]">
                {file ? `Selecionado: ${file.name}` : "Ate 10 MB. Screenshot da pagina inteira funciona melhor."}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pageType" className="block text-sm font-semibold">
                Tipo de pagina
              </label>
              <select
                id="pageType"
                value={pageType}
                onChange={(event) => setPageType(event.target.value as PageType)}
                className={`mt-2 ${fieldClasses}`}
              >
                {pageTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {PAGE_TYPE_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="goal" className="block text-sm font-semibold">
                Objetivo
              </label>
              <select
                id="goal"
                value={goal}
                onChange={(event) => setGoal(event.target.value as AnalysisGoal)}
                className={`mt-2 ${fieldClasses}`}
              >
                {analysisGoalOptions.map((option) => (
                  <option key={option} value={option}>
                    {GOAL_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="sourceLabel" className="block text-sm font-semibold">
              Rotulo <span className="font-normal text-[color:var(--muted)]">(opcional)</span>
            </label>
            <input
              id="sourceLabel"
              type="text"
              maxLength={120}
              placeholder="Ex.: Home v2"
              value={sourceLabel}
              onChange={(event) => setSourceLabel(event.target.value)}
              className={`mt-2 ${fieldClasses}`}
            />
          </div>

          {formError ? (
            <p role="alert" className="text-sm font-medium text-[color:var(--danger)]">
              {formError}
            </p>
          ) : null}
          {formSuccess ? (
            <p role="status" className="text-sm font-medium text-[color:var(--success)]">
              {formSuccess}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-2xl bg-[color:var(--accent-strong)] px-6 text-base font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Criar analise"}
          </button>
        </form>
      </article>

      {/* Lista de analises */}
      <article className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(57,40,27,0.08)] backdrop-blur md:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">Pipeline</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight">Analises recentes</h2>
          </div>
          <span role="status" aria-live="polite" className="text-xs text-[color:var(--muted)]">
            {refreshing && loaded ? "Atualizando..." : hasActive ? "Em andamento" : ""}
          </span>
        </div>

        <div className="mt-6">
          {!loaded ? (
            <p className="text-sm text-[color:var(--muted)]">Carregando...</p>
          ) : analyses.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[color:var(--border)] bg-white/40 p-8 text-center">
              <p className="text-base font-semibold">Nenhuma analise ainda</p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-[color:var(--muted)]">
                Envie uma URL ou um screenshot ao lado para criar a primeira analise.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {analyses.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/analyses/${item.id}`}
                    className="block rounded-[20px] border border-[color:var(--border)] bg-white/60 p-4 transition-colors hover:border-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {item.sourceLabel || item.url || "Upload de imagem"}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--muted)]">
                          {PAGE_TYPE_LABELS[item.pageType]} · {GOAL_LABELS[item.goal]} ·{" "}
                          <span className="tabular-nums">
                            {new Date(item.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.status === "failed" && item.error ? (
                      <p className="mt-3 rounded-xl bg-[color:var(--danger)]/8 px-3 py-2 text-xs text-[color:var(--danger)]">
                        {item.error}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>
    </section>
  );
}
