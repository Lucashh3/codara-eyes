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

const inputClasses =
  "w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]";
const sectionTitleClasses =
  "mb-3 text-xs font-medium uppercase tracking-[0.05em] text-[color:var(--muted)]";

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
    <main className="grid flex-1 lg:grid-cols-[420px_1fr]">
      {/* Painel esquerdo: nova analise */}
      <aside className="overflow-y-auto border-b border-[color:var(--border)] bg-[color:var(--surface)] p-6 lg:border-b-0 lg:border-r">
        <h2 className="mb-6 text-lg font-semibold tracking-[-0.01em]">Nova Análise</h2>

        <form onSubmit={handleSubmit} noValidate>
          {/* Origem */}
          <div className="mb-6">
            <div className={sectionTitleClasses}>Origem</div>
            <div
              className="mb-4 flex gap-1 rounded-lg bg-[color:var(--background)] p-1"
              role="radiogroup"
              aria-label="Tipo de entrada"
            >
              {(["url", "image"] as const).map((option) => {
                const active = inputType === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setInputType(option)}
                    className={`flex-1 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                    }`}
                  >
                    {option === "url" ? "URL" : "Imagem"}
                  </button>
                );
              })}
            </div>

            {inputType === "url" ? (
              <>
                <input
                  id="url"
                  type="url"
                  inputMode="url"
                  placeholder="https://exemplo.com/landing"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className={inputClasses}
                />
                <p className="mt-1.5 text-xs text-[color:var(--muted)]">
                  Capturamos desktop e mobile automaticamente.
                </p>
              </>
            ) : (
              <>
                <label
                  htmlFor="file"
                  className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-[color:var(--border)] px-4 py-6 text-center transition-colors hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="mb-2 h-10 w-10 text-[color:var(--muted)]"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className="text-[13px] text-[color:var(--muted)]">
                    <strong className="text-[color:var(--accent)]">Clique para enviar</strong> ou arraste uma imagem
                    <br />
                    <span className="text-[11px]">PNG, JPG até 10 MB</span>
                  </span>
                </label>
                <input
                  id="file"
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                {file ? (
                  <p className="mt-1.5 text-xs text-[color:var(--muted)]">Selecionado: {file.name}</p>
                ) : null}
              </>
            )}
          </div>

          {/* Configuracao */}
          <div className="mb-6">
            <div className={sectionTitleClasses}>Configuração</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pageType" className="mb-1 block text-xs text-[color:var(--muted)]">
                  Tipo de página
                </label>
                <select
                  id="pageType"
                  value={pageType}
                  onChange={(event) => setPageType(event.target.value as PageType)}
                  className={`${inputClasses} cursor-pointer appearance-none`}
                >
                  {pageTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {PAGE_TYPE_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="goal" className="mb-1 block text-xs text-[color:var(--muted)]">
                  Objetivo
                </label>
                <select
                  id="goal"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value as AnalysisGoal)}
                  className={`${inputClasses} cursor-pointer appearance-none`}
                >
                  {analysisGoalOptions.map((option) => (
                    <option key={option} value={option}>
                      {GOAL_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="sourceLabel" className="mb-1 block text-xs text-[color:var(--muted)]">
                Rótulo (opcional)
              </label>
              <input
                id="sourceLabel"
                type="text"
                maxLength={120}
                placeholder="Ex: Teste homepage v2"
                value={sourceLabel}
                onChange={(event) => setSourceLabel(event.target.value)}
                className={inputClasses}
              />
              <div className="mt-1 text-right text-[11px] text-[color:var(--muted)]">{sourceLabel.length}/120</div>
            </div>
          </div>

          {formError ? (
            <p role="alert" className="mb-3 text-sm font-medium text-[color:var(--danger)]">
              {formError}
            </p>
          ) : null}
          {formSuccess ? (
            <p role="status" className="mb-3 text-sm font-medium text-[color:var(--success)]">
              {formSuccess}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[color:var(--accent)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[color:var(--accent-strong)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Criar análise"}
          </button>
        </form>
      </aside>

      {/* Painel direito: lista */}
      <section className="overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Análises Recentes</h2>
          {(refreshing && loaded) || hasActive ? (
            <div role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs text-[color:var(--muted)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--success)] motion-reduce:animate-none" />
              <span>{refreshing && loaded ? "Atualizando..." : "Em andamento"}</span>
            </div>
          ) : null}
        </div>

        {!loaded ? (
          <p className="text-sm text-[color:var(--muted)]">Carregando...</p>
        ) : analyses.length === 0 ? (
          <div className="px-6 py-12 text-center text-[color:var(--muted)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="mx-auto mb-4 h-12 w-12 text-[color:var(--border)]"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3 className="mb-2 text-base font-medium text-[color:var(--foreground)]">Nenhuma análise ainda</h3>
            <p className="text-sm">Crie sua primeira análise usando o formulário ao lado.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {analyses.map((item) => (
              <Link
                key={item.id}
                href={`/analyses/${item.id}`}
                className="block rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition hover:border-[color:var(--accent)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-[color:var(--foreground)]">
                    {item.sourceLabel || item.url || "Upload de imagem"}
                  </h3>
                  <StatusBadge status={item.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded bg-[color:var(--background)] px-1.5 py-0.5 text-[11px] text-[color:var(--muted)]">
                    {PAGE_TYPE_LABELS[item.pageType]}
                  </span>
                  <span className="rounded bg-[color:var(--background)] px-1.5 py-0.5 text-[11px] text-[color:var(--muted)]">
                    {GOAL_LABELS[item.goal]}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--muted)]">
                    {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                {item.status === "failed" && item.error ? (
                  <p className="mt-2 text-xs text-[color:var(--danger)]">{item.error}</p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
