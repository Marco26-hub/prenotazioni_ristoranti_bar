"use client";

import { useState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tPrenota } from "@/i18n/prenota";

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
  const t = tPrenota(useLingua());
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
        setError(data.error ?? t("errore.invio"));
      } else {
        setDone(t("esito.ricevuta", { nome: venueName }));
      }
    } catch {
      setError(t("errore.rete"));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-accent bg-surface p-5 text-center">
        <p className="text-lg font-semibold">{t("esito.grazie")}</p>
        <p className="mt-2 text-muted">{done}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={LABEL} htmlFor="name">
          {t("form.nome")}
        </label>
        <input id="name" name="name" required autoComplete="name" className={FIELD} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="partySize">
            {t("form.persone")}
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
            {t("form.quando")}
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
          {t("form.telefono")}
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" className={FIELD} />
      </div>

      <div>
        <label className={LABEL} htmlFor="email">
          {t("form.email")}
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className={FIELD} />
      </div>

      <p className="text-sm text-muted">{t("form.contatti")}</p>

      <div>
        <label className={LABEL} htmlFor="notes">
          {t("form.note")}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={300}
          placeholder={t("form.note.placeholder")}
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
        {sending ? t("form.invio") : t("form.invia")}
      </button>

      <p className="text-xs text-muted">
        {t("form.privacy", { nome: venueName })}{" "}
        <a href={`/privacy/${slug}`} className="underline underline-offset-2">
          {t("form.privacy.link")}
        </a>
        .
      </p>
    </form>
  );
}
