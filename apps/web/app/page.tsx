import Link from "next/link";

import { Dashboard } from "../components/dashboard";
import { LogoutButton } from "../components/logout-button";
import { StatusPill } from "../components/status-pill";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-7xl flex-col px-6 pb-16 pt-8 md:px-10 lg:px-12">
      <header className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_70px_rgba(57,40,27,0.08)] backdrop-blur md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <StatusPill label="Painel interno" tone="success" />
            <h1 className="mt-4 text-3xl leading-tight md:text-4xl">Codara Eyes</h1>
            <p className="mt-3 max-w-2xl text-base leading-8 text-[color:var(--muted)]">
              Envie uma URL ou um screenshot e acompanhe o status da analise preditiva de atencao.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/compare"
              className="min-h-11 rounded-full border border-[color:var(--border)] bg-white/60 px-5 text-sm font-medium leading-[44px] text-[color:var(--accent-strong)] outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
            >
              Comparar A/B
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <Dashboard />
    </main>
  );
}
