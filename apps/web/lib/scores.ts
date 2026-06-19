// Metadado dos 6 scores de UX, compartilhado entre o detalhe e a comparacao.
// `betterHigh`: true = maior e melhor; false = maior e pior (problema).
export type ScoreMeta = { key: string; label: string; betterHigh: boolean };

export const SCORE_META: ScoreMeta[] = [
  { key: "ctaVisibility", label: "Visibilidade do CTA", betterHigh: true },
  { key: "headlineAttention", label: "Atencao na headline", betterHigh: true },
  { key: "visualHierarchy", label: "Hierarquia visual", betterHigh: true },
  { key: "attentionCompetition", label: "Competicao por atencao", betterHigh: false },
  { key: "aboveTheFoldEfficiency", label: "Eficiencia acima da dobra", betterHigh: true },
  { key: "clutterScore", label: "Poluicao visual", betterHigh: false },
];
