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

function barColor(q: number): string {
  if (q >= 0.66) return "bg-[color:var(--success)]";
  if (q >= 0.4) return "bg-[oklch(70%_0.16_85)]";
  return "bg-[color:var(--danger)]";
}

export function ScoreCard({ label, value, betterHigh }: ScoreCardProps) {
  const q = quality(value, betterHigh);
  const percent = Math.round(value * 100);

  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-[13px]">{label}</span>
      <div
        className="h-1.5 w-[120px] overflow-hidden rounded-full bg-[color:var(--background)]"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
      >
        <div className={`h-full rounded-full ${barColor(q)}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="w-10 text-right font-[family-name:var(--font-mono)] text-[13px] font-semibold tabular-nums">
        {percent}%
      </span>
      <span className="w-20 text-right text-[10px] text-[color:var(--muted)]">
        {betterHigh ? "Maior = melhor" : "Menor = melhor"}
      </span>
    </div>
  );
}
