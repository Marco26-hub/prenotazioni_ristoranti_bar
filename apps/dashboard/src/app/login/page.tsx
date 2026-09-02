"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (result?.error) {
      setError("Email o password non corretti");
      return;
    }
    window.location.href = callbackUrl;
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Accesso staff</h1>
      <p className="mb-6 text-sm text-muted">Gestisci tavoli, ordini e menu del tuo locale.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
        >
          {submitting ? "Accesso..." : "Accedi"}
        </button>
      </form>

      <a href="/registrati" className="mt-5 block text-center text-sm text-muted underline">
        Registra un nuovo locale
      </a>
      </div>
    </main>
  );
}
