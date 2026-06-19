import { SCORE_META } from "./scores";

export type Scores = Record<string, number>;

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function computeDeltas(base: Scores, target: Scores): Record<string, number> {
  const deltas: Record<string, number> = {};
  for (const { key } of SCORE_META) {
    deltas[key] = round((target[key] ?? 0) - (base[key] ?? 0));
  }
  return deltas;
}

// Resumo comparativo por regras: destaca os scores que mais melhoram/pioram,
// respeitando a direcao de cada um. "Versao B" = alvo (target).
export function buildSummary(deltas: Record<string, number>): string {
  const items = SCORE_META.map((meta) => {
    const delta = deltas[meta.key] ?? 0;
    return { ...meta, delta, improvement: (meta.betterHigh ? 1 : -1) * delta };
  }).filter((item) => Math.abs(item.delta) >= 0.05);

  if (items.length === 0) {
    return "As duas versoes tem desempenho equivalente nos scores analisados.";
  }

  const better = items.filter((i) => i.improvement > 0).sort((a, b) => b.improvement - a.improvement);
  const worse = items.filter((i) => i.improvement < 0).sort((a, b) => a.improvement - b.improvement);

  const fmt = (item: (typeof items)[number]) =>
    `${item.label.toLowerCase()} (${item.delta > 0 ? "+" : ""}${Math.round(item.delta * 100)}%)`;

  const parts: string[] = [];
  if (better.length > 0) {
    parts.push(`A versao B melhora ${better.slice(0, 2).map(fmt).join(" e ")}`);
  }
  if (worse.length > 0) {
    parts.push(`${better.length > 0 ? "mas piora" : "A versao B piora"} ${worse.slice(0, 2).map(fmt).join(" e ")}`);
  }
  return `${parts.join(", ")}.`;
}
