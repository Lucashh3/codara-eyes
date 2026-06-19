"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[18px] w-[18px]">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5c-4.5 0-8 3-9.5 7 1.5 4 5 7 9.5 7s8-3 9.5-7c-1.5-4-5-7-9.5-7z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[18px] w-[18px]">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Nao foi possivel entrar.");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next") || "/";
      router.replace(next);
      router.refresh();
    } catch {
      setError("Falha de conexao. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px]">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-8 py-10">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--accent)] text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 5c-4.5 0-8 3-9.5 7 1.5 4 5 7 9.5 7s8-3 9.5-7c-1.5-4-5-7-9.5-7z" />
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-[-0.02em]">Codara Eyes</span>
          </div>

          <div className="mb-8">
            <h1 className="text-[clamp(28px,4vw,36px)] font-semibold leading-tight tracking-[-0.02em]">Entrar</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">Acesse sua conta para analisar landing pages</p>
          </div>

          {error ? (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3.5 py-3 text-sm text-[color:var(--danger)]"
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-[color:var(--muted)]">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  aria-invalid={error ? true : undefined}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3.5 py-3 pr-12 text-[15px] text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center p-1 text-[color:var(--muted)] transition-colors hover:text-[color:var(--foreground)]"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--accent)] px-5 py-3 text-[15px] font-medium text-white transition hover:bg-[color:var(--accent-strong)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-white" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[13px] text-[color:var(--muted)]">
            Acesso interno ·{" "}
            <a href="mailto:suporte@codara.com" className="text-[color:var(--accent)] hover:underline">
              Precisa de ajuda?
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
