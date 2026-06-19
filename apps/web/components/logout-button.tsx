"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center rounded-lg px-2.5 py-2 text-[13px] font-medium text-[color:var(--muted)] outline-none transition-colors hover:text-[color:var(--foreground)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] disabled:opacity-60"
    >
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
