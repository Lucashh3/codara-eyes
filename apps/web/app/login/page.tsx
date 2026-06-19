"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-[0_20px_70px_rgba(57,40,27,0.08)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">Codara Eyes</p>
        <h1 className="mt-3 text-3xl leading-tight">Acesso ao painel</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
          Ambiente interno. Informe a senha de acesso para continuar.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold">
              Senha
            </label>
            <div className="mt-2 flex items-stretch gap-2">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
                className="min-h-11 flex-1 rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 text-base text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 text-sm font-medium text-[color:var(--muted)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                aria-pressed={showPassword}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {error ? (
            <p id="login-error" role="alert" className="text-sm font-medium text-[color:var(--danger)]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-2xl bg-[color:var(--accent-strong)] px-6 text-base font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
