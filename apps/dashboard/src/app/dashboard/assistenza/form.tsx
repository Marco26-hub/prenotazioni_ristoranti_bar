"use client";

import { useActionState } from "react";
import { apriTicket } from "../assistenza-actions";

const CAMPO = "w-full rounded-lg border border-border bg-background px-3 text-sm";

export function ChiediAssistenza() {
  const [stato, azione, pending] = useActionState<
    { ok?: string; error?: string } | null,
    FormData
  >(async (_p, fd) => apriTicket(fd), null);

  return (
    <form action={azione} className="space-y-3">
      <label className="block text-sm">
        Di cosa si tratta
        <input
          name="oggetto"
          required
          maxLength={120}
          placeholder="Le comande non arrivano in cucina"
          className={`${CAMPO} mt-1 min-h-11`}
        />
      </label>
      <label className="block text-sm">
        Raccontaci cosa succede
        <textarea
          name="messaggio"
          required
          rows={4}
          maxLength={4000}
          placeholder="Da stamattina il tablet del bar non riceve più niente. Ho provato a ricaricare."
          className={`${CAMPO} mt-1 py-2`}
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="urgenza" value="blocca_servizio" className="h-4 w-4" />
        Blocca il servizio adesso
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Invio…" : "Invia richiesta"}
      </button>
      {stato?.ok && <p role="status" className="text-sm text-success">{stato.ok}</p>}
      {stato?.error && <p role="alert" className="text-sm text-danger">{stato.error}</p>}
    </form>
  );
}
