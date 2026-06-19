import Link from "next/link";

import { Dashboard } from "../components/dashboard";
import { LogoutButton } from "../components/logout-button";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-[color:var(--accent)] text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[18px] w-[18px]">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 5c-4.5 0-8 3-9.5 7 1.5 4 5 7 9.5 7s8-3 9.5-7c-1.5-4-5-7-9.5-7z" />
            </svg>
          </div>
          <span className="text-base font-semibold tracking-[-0.02em]">Codara Eyes</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/compare"
            className="inline-flex items-center rounded-lg border border-[color:var(--border)] bg-transparent px-3.5 py-2 text-[13px] font-medium text-[color:var(--foreground)] transition-colors hover:border-[color:var(--foreground)]"
          >
            Comparar A/B
          </Link>
          <LogoutButton />
        </div>
      </header>

      <Dashboard />
    </div>
  );
}
