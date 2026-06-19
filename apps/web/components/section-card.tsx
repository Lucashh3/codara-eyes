import { ReactNode } from "react";

type SectionCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function SectionCard({ eyebrow, title, description, children }: SectionCardProps) {
  return (
    <article className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(57,40,27,0.08)] backdrop-blur">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">{eyebrow}</p>
      <h3 className="text-2xl font-semibold leading-tight text-[var(--foreground)]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{description}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </article>
  );
}
