type ScoreCardProps = {
  label: string;
  value: number;
  betterHigh: boolean;
};

// Qualidade normalizada (1 = otimo) respeitando a direcao do score. Scores
// "maior = pior" (competicao, clutter) sao invertidos para colorir a barra.
function quality(value: number, betterHigh: boolean): number {
  return betterHigh ? value : 1 - value;
}

function toneFor(q: number): { bar: string; text: string } {
  if (q >= 0.66) return { bar: "bg-[color:var(--success)]", text: "text-[color:var(--success)]" };
  if (q >= 0.4) return { bar: "bg-[color:var(--accent)]", text: "text-[color:var(--accent-strong)]" };
  return { bar: "bg-[color:var(--danger)]", text: "text-[color:var(--danger)]" };
}

export function ScoreCard({ label, value, betterHigh }: ScoreCardProps) {
  const q = quality(value, betterHigh);
  const tone = toneFor(q);
  const percent = Math.round(value * 100);

  return (
    <div className="rounded-[20px] border border-[color:var(--border)] bg-white/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        <p className={`text-lg font-semibold tabular-nums ${tone.text}`}>{percent}</p>
      </div>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
      >
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-[color:var(--muted)]">
        {betterHigh ? "Maior e melhor" : "Menor e melhor"}
      </p>
    </div>
  );
}
