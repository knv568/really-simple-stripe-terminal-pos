"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/branding";

export function LoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Incorrect PIN");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not sign in. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pos-page flex items-center justify-center">
      <div className="w-full max-w-[390px] rounded-2xl border border-border bg-surface p-5 shadow-sm">
        {BRAND.locationSubtitle ? (
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            {BRAND.locationSubtitle}
          </p>
        ) : null}
        <h1
          className={`text-xl font-semibold leading-tight ${BRAND.locationSubtitle ? "mt-1" : ""}`}
        >
          {BRAND.businessName}
        </h1>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Staff PIN</span>
            <input
              autoComplete="one-time-code"
              autoFocus
              className="pos-input pos-pin-input w-full rounded-xl border border-border px-3 py-3 text-center text-lg tracking-[0.35em] outline-none focus:border-accent"
              inputMode="numeric"
              name="pin"
              maxLength={8}
              onChange={(event) => setPin(event.target.value)}
              placeholder="••••"
              pattern="[0-9]*"
              spellCheck={false}
              type="tel"
              value={pin}
            />
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            className="touch-target w-full rounded-xl bg-accent px-4 py-3.5 text-base font-semibold text-white active:bg-accent-hover disabled:opacity-60"
            disabled={loading || pin.length < 4}
            type="submit"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
