"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SCORE_META } from "../../lib/scores";

type Option = { id: string; label: string; status: string };
type Side = { id: string; title: string; scores: Record<string, number>; heatmapUrl: string | null };
type Result = { summary: string; deltas: Record<string, number>; base: Side; target: Side };

const fieldClasses =
  "min-h-11 w-full rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 text-base text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]";

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
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-6 pb-16 pt-8 md:px-10 lg:px-12">
      <Link href="/" className="text-sm text-[color:var(--muted)] hover:text-[var(--foreground)]">
        ← Painel
      </Link>

      <header className="mt-6 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(57,40,27,0.08)] backdrop-blur md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">Comparacao A/B</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight md:text-3xl">Comparar duas analises</h1>

        {options.length < 2 ? (
          <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">
            Voce precisa de pelo menos duas analises concluidas para comparar.
          </p>
        ) : (
          <form onSubmit={handleCompare} className="mt-6 grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <label htmlFor="base" className="block text-sm font-semibold">
                Versao A (base)
              </label>
              <select id="base" value={baseId} onChange={(e) => setBaseId(e.target.value)} required className={`mt-2 ${fieldClasses}`}>
                <option value="" disabled>
                  Selecione...
                </option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="target" className="block text-sm font-semibold">
                Versao B (alvo)
              </label>
              <select id="target" value={targetId} onChange={(e) => setTargetId(e.target.value)} required className={`mt-2 ${fieldClasses}`}>
                <option value="" disabled>
                  Selecione...
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
              disabled={loading}
              className="min-h-11 rounded-2xl bg-[color:var(--accent-strong)] px-6 text-base font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
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
      </header>

      {result ? <ComparisonResult result={result} /> : null}
    </main>
  );
}

function ComparisonResult({ result }: { result: Result }) {
  return (
    <div className="mt-6 space-y-6">
      <article className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(57,40,27,0.08)] backdrop-blur md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">Resumo</p>
        <p className="mt-3 text-base leading-8">{result.summary}</p>
      </article>

      <div className="grid gap-6 sm:grid-cols-2">
        {[result.base, result.target].map((side, index) => (
          <article
            key={side.id}
            className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[0_20px_60px_rgba(57,40,27,0.08)] backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              {index === 0 ? "Versao A" : "Versao B"}
            </p>
            <p className="mt-1 truncate text-sm font-semibold">{side.title}</p>
            <div className="mt-3 overflow-hidden rounded-[16px] border border-[color:var(--border)] bg-black/5">
              {side.heatmapUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={side.heatmapUrl} alt={`Heatmap ${side.title}`} className="block w-full" />
              ) : (
                <p className="p-6 text-sm text-[color:var(--muted)]">Sem heatmap.</p>
              )}
            </div>
          </article>
        ))}
      </div>

      <article className="overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_20px_60px_rgba(57,40,27,0.08)] backdrop-blur">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)] text-left text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">
              <th className="px-5 py-3 font-semibold">Score</th>
              <th className="px-5 py-3 text-right font-semibold">A</th>
              <th className="px-5 py-3 text-right font-semibold">B</th>
              <th className="px-5 py-3 text-right font-semibold">Delta</th>
            </tr>
          </thead>
          <tbody>
            {SCORE_META.map((meta) => {
              const delta = result.deltas[meta.key] ?? 0;
              const improvement = (meta.betterHigh ? 1 : -1) * delta;
              const color =
                Math.abs(delta) < 0.005
                  ? "text-[color:var(--muted)]"
                  : improvement > 0
                    ? "text-[color:var(--success)]"
                    : "text-[color:var(--danger)]";
              return (
                <tr key={meta.key} className="border-b border-[color:var(--border)] last:border-0">
                  <td className="px-5 py-3">{meta.label}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {Math.round((result.base.scores[meta.key] ?? 0) * 100)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {Math.round((result.target.scores[meta.key] ?? 0) * 100)}
                  </td>
                  <td className={`px-5 py-3 text-right font-semibold tabular-nums ${color}`}>
                    {delta > 0 ? "+" : ""}
                    {Math.round(delta * 100)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>
    </div>
  );
}
