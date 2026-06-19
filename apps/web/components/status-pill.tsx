type StatusPillProps = {
  label: string;
  tone?: "default" | "success" | "warning";
};

const toneClasses: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  default: "bg-black/5 text-[var(--foreground)]",
  success: "bg-[color:var(--success)]/12 text-[color:var(--success)]",
  warning: "bg-[color:var(--accent)]/12 text-[color:var(--accent-strong)]",
};

export function StatusPill({ label, tone = "default" }: StatusPillProps) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}
