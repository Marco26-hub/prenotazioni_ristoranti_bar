"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupResult } from "./actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<SignupResult | null, FormData>(
    async (_prev, formData) => signup(formData),
    null
  );

  if (state?.success) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-4">
        <h1 className="text-xl font-semibold">Locale creato</h1>
        <p className="text-sm">
          Ora puoi accedere e trovare i QR dei tavoli già pronti da stampare in
          Gestione tavoli.
        </p>
        <Link href="/login" className="rounded bg-black py-2 text-center text-white">
          Vai al login
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-4">
      <h1 className="mb-6 text-xl font-semibold">Registra il tuo locale</h1>

      <form action={formAction} className="space-y-3">
        <input
          name="venueName"
          placeholder="Nome del locale"
          required
          className="w-full rounded border p-2"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full rounded border p-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Password (min 8 caratteri)"
          required
          minLength={8}
          className="w-full rounded border p-2"
        />
        <div>
          <label className="mb-1 block text-sm">Quanti tavoli</label>
          <input
            name="tableCount"
            type="number"
            min="1"
            max="200"
            defaultValue={10}
            required
            className="w-full rounded border p-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            Creiamo subito un QR per ogni tavolo. Potrai aggiungerne o toglierne dopo.
          </p>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
        >
          {pending ? "Creazione..." : "Crea locale"}
        </button>
      </form>

      <Link href="/login" className="mt-4 text-center text-sm underline">
        Ho già un account
      </Link>
    </main>
  );
}
