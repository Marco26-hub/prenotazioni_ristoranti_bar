"use client";

import { useState } from "react";

const FIELD =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base";
const LABEL = "block text-sm font-medium";

/** Il locale non prende prenotazioni per l'istante stesso. */
function minDateTimeLocal(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  // datetime-local vuole l'ora locale senza fuso, e toISOString darebbe UTC:
  // usarlo sposterebbe l'orario minimo di due ore in estate.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingForm({ slug, venueName }: { slug: string; venueName: string }) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          email: String(form.get("email") ?? ""),
          partySize: Number(form.get("partySize")),
          reservedAt: String(form.get("reservedAt") ?? ""),
          notes: String(form.get("notes") ?? ""),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Non siamo riusciti a registrare la prenotazione");
      } else {
        setDone(
          `Prenotazione ricevuta. ${venueName} ti contatterà per la conferma.`
        );
      }
    } catch {
      setError("Connessione non riuscita. Controlla la rete e riprova.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-accent bg-surface p-5 text-center">
        <p className="text-lg font-semibold">Grazie</p>
        <p className="mt-2 text-muted">{done}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={LABEL} htmlFor="name">
          Nome e cognome
        </label>
        <input id="name" name="name" required autoComplete="name" className={FIELD} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="partySize">
            Quante persone
          </label>
          <input
            id="partySize"
            name="partySize"
            type="number"
            min="1"
            max="20"
            defaultValue={2}
            required
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="reservedAt">
            Giorno e ora
          </label>
          <input
            id="reservedAt"
            name="reservedAt"
            type="datetime-local"
            min={minDateTimeLocal()}
            required
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="phone">
          Telefono
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" className={FIELD} />
      </div>

      <div>
        <label className={LABEL} htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className={FIELD} />
      </div>

      <p className="text-sm text-muted">
        Lascia almeno uno dei due: servono a confermarti il tavolo.
      </p>

      <div>
        <label className={LABEL} htmlFor="notes">
          Richieste particolari
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={300}
          placeholder="Allergie, seggiolone, tavolo all'aperto…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="min-h-12 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-60"
      >
        {sending ? "Invio…" : "Prenota il tavolo"}
      </button>

      <p className="text-xs text-muted">
        Inviando accetti che {venueName} tratti i tuoi dati per gestire la
        prenotazione. Vedi{" "}
        <a href="/privacy" className="underline underline-offset-2">
          l&apos;informativa privacy
        </a>
        .
      </p>
    </form>
  );
}
