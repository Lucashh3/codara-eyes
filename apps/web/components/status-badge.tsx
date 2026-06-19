import type { AnalysisStatus } from "@codara-eyes/shared";

type Kind = "neutral" | "active" | "success" | "danger";

// Rotulo em PT + cor. A informacao nao depende so da cor: ha texto e um ponto
// indicador (regra color-not-only).
const STATUS_MAP: Record<AnalysisStatus, { label: string; kind: Kind; active?: boolean }> = {
  pending: { label: "Na fila", kind: "neutral" },
  capturing: { label: "Capturando", kind: "active", active: true },
  processing: { label: "Processando", kind: "active", active: true },
  reporting: { label: "Gerando relatorio", kind: "active", active: true },
  completed: { label: "Concluido", kind: "success" },
  failed: { label: "Falhou", kind: "danger" },
};

const KIND_CLASSES: Record<Kind, { badge: string; dot: string }> = {
  neutral: { badge: "bg-black/[0.04] text-[color:var(--muted)]", dot: "bg-[color:var(--muted)]" },
  active: { badge: "bg-[oklch(92%_0.06_85)] text-[oklch(50%_0.14_85)]", dot: "bg-[oklch(70%_0.16_85)]" },
  success: { badge: "bg-[oklch(92%_0.06_145)] text-[oklch(40%_0.12_145)]", dot: "bg-[color:var(--success)]" },
  danger: { badge: "bg-[oklch(92%_0.06_25)] text-[oklch(45%_0.14_25)]", dot: "bg-[color:var(--danger)]" },
};

export function StatusBadge({ status }: { status: AnalysisStatus }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const classes = KIND_CLASSES[config.kind];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.02em] ${classes.badge}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${classes.dot} ${config.active ? "animate-pulse motion-reduce:animate-none" : ""}`}
      />
      {config.label}
    </span>
  );
}
