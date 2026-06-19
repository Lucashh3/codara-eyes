"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SCORE_META } from "../../lib/scores";

type Option = { id: string; label: string; status: string };
type Side = { id: string; title: string; scores: Record<string, number>; heatmapUrl: string | null };
type Result = { summary: string; deltas: Record<string, number>; base: Side; target: Side };

const selectClasses =
  "w-full appearance-none rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 pr-8 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]";
const labelClasses = "text-xs font-medium uppercase tracking-[0.05em] text-[color:var(--muted)]";

export default function ComparePage() {
  const [options, setOptions] = useState<Option[]>([]);
  const [baseId, setBaseId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/analyses", { cache: "no-store" });
        const data = await response.json();
        const completed: Option[] = (data.analyses ?? [])
          .filter((a: { status: string }) => a.status === "completed")
          .map((a: { id: string; sourceLabel: string | null; url: string | null; status: string }) => ({
            id: a.id,
            status: a.status,
            label: a.sourceLabel || a.url || "Upload de imagem",
          }));
        setOptions(completed);
      } catch {
        // silencioso
      }
    })();
  }, []);

  const canCompare = Boolean(baseId && targetId && baseId !== targetId);

  async function handleCompare(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const response = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseAnalysisId: baseId, targetAnalysisId: targetId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Nao foi possivel comparar.");
        return;
      }
      setResult(data);
    } catch {
      setError("Falha de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-3">
        <Link
          href="/"
          aria-label="Voltar ao painel"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--border)] text-[color:var(--muted)] transition-colors hover:border-[color:var(--foreground)] hover:text-[color:var(--foreground)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold">Comparação A/B</h1>
      </header>

      <main className="mx-auto w-full max-w-[1400px] p-6">
        {/* Selecao */}
        <section className="mb-6 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          {options.length < 2 ? (
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              Você precisa de pelo menos duas análises concluídas para comparar.
            </p>
          ) : (
            <form
              onSubmit={handleCompare}
              className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr_auto]"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="base" className={labelClasses}>
                  Versão A (base)
                </label>
                <select
                  id="base"
                  value={baseId}
                  onChange={(e) => setBaseId(e.target.value)}
                  required
                  className={selectClasses}
                >
                  <option value="" disabled>
                    Selecione uma análise...
                  </option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="hidden h-10 w-10 place-items-center self-end rounded-full bg-[color:var(--background)] text-xs font-semibold text-[color:var(--muted)] sm:grid">
                VS
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="target" className={labelClasses}>
                  Versão B (alvo)
                </label>
                <select
                  id="target"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  required
                  className={selectClasses}
                >
                  <option value="" disabled>
                    Selecione uma análise...
                  </option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !canCompare}
                className="rounded-lg bg-[color:var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Comparando..." : "Comparar"}
              </button>
            </form>
          )}

          {error ? (
            <p role="alert" className="mt-4 text-sm font-medium text-[color:var(--danger)]">
              {error}
            </p>
          ) : null}
        </section>

        {result ? (
          <ComparisonResult result={result} />
        ) : (
          <div className="px-6 py-16 text-center text-[color:var(--muted)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="mx-auto mb-4 h-16 w-16 text-[color:var(--border)]"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <h3 className="mb-2 text-lg font-medium text-[color:var(--foreground)]">
              Selecione duas análises para comparar
            </h3>
            <p className="mx-auto max-w-md text-sm">
              Escolha uma versão base (A) e uma versão alvo (B) para visualizar as diferenças nos mapas de atenção e
              scores de UX.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function ComparisonResult({ result }: { result: Result }) {
  const sides = [
    { side: result.base, badge: "A", badgeClass: "bg-[oklch(55%_0.14_250)]" },
    { side: result.target, badge: "B", badgeClass: "bg-[color:var(--accent)]" },
  ];

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
        <h2 className="mb-3 text-base font-semibold">Resumo Executivo</h2>
        <p className="leading-relaxed text-[color:var(--muted)]">{result.summary}</p>
      </section>

      {/* Heatmaps lado a lado */}
      <section className="grid gap-6 md:grid-cols-2">
        {sides.map(({ side, badge, badgeClass }) => (
          <div
            key={side.id}
            className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]"
          >
            <div className="flex items-center justify-between border-b border-[color:var(--border)] p-4">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold text-white ${badgeClass}`}
                >
                  {badge}
                </span>
                <span className="max-w-[200px] truncate text-[13px] font-medium">{side.title}</span>
              </div>
            </div>
            <div className="bg-[color:var(--background)]">
              {side.heatmapUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={side.heatmapUrl} alt={`Heatmap ${side.title}`} className="block w-full" />
              ) : (
                <p className="p-6 text-sm text-[color:var(--muted)]">Sem heatmap.</p>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Tabela de delta */}
      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
        <h2 className="mb-4 text-base font-semibold">Comparação de Scores</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Score", "Versão A", "Versão B", "Delta", "Comparação"].map((head, index) => (
                  <th
                    key={head}
                    className={`border-b border-[color:var(--border)] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.05em] text-[color:var(--muted)] ${
                      index === 0 || index === 4 ? "text-left" : "text-right"
                    }`}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCORE_META.map((meta) => {
                const base = result.base.scores[meta.key] ?? 0;
                const target = result.target.scores[meta.key] ?? 0;
                const delta = result.deltas[meta.key] ?? 0;
                const improvement = (meta.betterHigh ? 1 : -1) * delta;
                const neutral = Math.abs(delta) < 0.005;
                const color = neutral
                  ? "text-[color:var(--muted)]"
                  : improvement > 0
                    ? "text-[color:var(--success)]"
                    : "text-[color:var(--danger)]";
                return (
                  <tr key={meta.key}>
                    <td className="border-b border-[color:var(--border)] px-4 py-3 text-sm">{meta.label}</td>
                    <td className="border-b border-[color:var(--border)] px-4 py-3 text-right font-[family-name:var(--font-mono)] text-sm tabular-nums">
                      {Math.round(base * 100)}%
                    </td>
                    <td className="border-b border-[color:var(--border)] px-4 py-3 text-right font-[family-name:var(--font-mono)] text-sm tabular-nums">
                      {Math.round(target * 100)}%
                    </td>
                    <td
                      className={`border-b border-[color:var(--border)] px-4 py-3 text-right font-[family-name:var(--font-mono)] text-sm font-semibold tabular-nums ${color}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {!neutral ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="h-3 w-3"
                          >
                            {delta > 0 ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
                          </svg>
                        ) : null}
                        {delta > 0 ? "+" : ""}
                        {Math.round(delta * 100)}
                      </span>
                    </td>
                    <td className="border-b border-[color:var(--border)] px-4 py-3" style={{ width: 200 }}>
                      <div className="flex flex-col gap-1">
                        <div
                          className="h-1.5 rounded-full bg-[oklch(55%_0.14_250)]"
                          style={{ width: `${Math.round(base * 100)}%` }}
                        />
                        <div
                          className="h-1.5 rounded-full bg-[color:var(--accent)]"
                          style={{ width: `${Math.round(target * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
