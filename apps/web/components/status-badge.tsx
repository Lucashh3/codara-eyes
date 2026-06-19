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
  neutral: { badge: "bg-black/5 text-[color:var(--muted)]", dot: "bg-[color:var(--muted)]" },
  active: { badge: "bg-[color:var(--accent)]/12 text-[color:var(--accent-strong)]", dot: "bg-[color:var(--accent)]" },
  success: { badge: "bg-[color:var(--success)]/12 text-[color:var(--success)]", dot: "bg-[color:var(--success)]" },
  danger: { badge: "bg-[color:var(--danger)]/12 text-[color:var(--danger)]", dot: "bg-[color:var(--danger)]" },
};

export function StatusBadge({ status }: { status: AnalysisStatus }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const classes = KIND_CLASSES[config.kind];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${classes.badge}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${classes.dot} ${config.active ? "animate-pulse motion-reduce:animate-none" : ""}`}
      />
      {config.label}
    </span>
  );
}
