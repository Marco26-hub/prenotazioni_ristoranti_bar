"use client";

import { useActionState } from "react";
import { salvaAnnuncio, type AnnuncioResult } from "./annuncio-actions";

export interface AnnuncioCorrente {
  title: string | null;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  starts_at: Date | null;
  ends_at: Date | null;
  enabled: boolean;
}

const CAMPO =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";
const ETICHETTA = "mb-1 block text-sm";

/** `datetime-local` vuole l'ora locale senza fuso: toISOString darebbe UTC. */
function perInput(d: Date | null): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function AnnuncioForm({ corrente }: { corrente: AnnuncioCorrente }) {
  const [state, formAction, pending] = useActionState<AnnuncioResult | null, FormData>(
    async (_prev, formData) => salvaAnnuncio(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-3">
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={corrente.enabled}
          className="h-5 w-5"
        />
        Mostra l&apos;annuncio ai clienti
      </label>

      <div>
        <label className={ETICHETTA} htmlFor="ann-title">
          Titolo
        </label>
        <input
          id="ann-title"
          name="title"
          maxLength={80}
          defaultValue={corrente.title ?? ""}
          placeholder="Menu del giorno · Serata pesce"
          className={CAMPO}
        />
      </div>

      <div>
        <label className={ETICHETTA} htmlFor="ann-body">
          Testo
        </label>
        <textarea
          id="ann-body"
          name="body"
          rows={4}
          maxLength={600}
          defaultValue={corrente.body ?? ""}
          placeholder={"Antipasto di mare\nRisotto allo scoglio\nDolce della casa\n\n32 € a persona, bevande escluse"}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted">
          Gli a capo vengono rispettati: puoi scrivere il menu una portata per riga.
        </p>
      </div>

      <div>
        <label className={ETICHETTA} htmlFor="ann-image">
          Immagine (facoltativa)
        </label>
        {corrente.image_url && (
          <div className="mb-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={corrente.image_url}
              alt=""
              className="h-16 w-28 rounded-lg object-cover"
            />
            <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="removeImage" className="h-5 w-5" />
              Rimuovi
            </label>
          </div>
        )}
        <input
          id="ann-image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm"
        />
        <p className="mt-1 text-xs text-muted">
          JPG, PNG o WEBP fino a 500 KB. Se hai già la locandina della serata,
          caricala così com&apos;è. Lasciando vuoto resta quella attuale.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={ETICHETTA} htmlFor="ann-cta-label">
            Bottone — testo
          </label>
          <input
            id="ann-cta-label"
            name="ctaLabel"
            maxLength={40}
            defaultValue={corrente.cta_label ?? ""}
            placeholder="Prenota un tavolo"
            className={CAMPO}
          />
        </div>
        <div>
          <label className={ETICHETTA} htmlFor="ann-cta-url">
            Bottone — link
          </label>
          <input
            id="ann-cta-url"
            name="ctaUrl"
            type="url"
            defaultValue={corrente.cta_url ?? ""}
            placeholder="https://…"
            className={CAMPO}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={ETICHETTA} htmlFor="ann-start">
            Da (facoltativo)
          </label>
          <input
            id="ann-start"
            name="startsAt"
            type="datetime-local"
            defaultValue={perInput(corrente.starts_at)}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={ETICHETTA} htmlFor="ann-end">
            Fino a (facoltativo)
          </label>
          <input
            id="ann-end"
            name="endsAt"
            type="datetime-local"
            defaultValue={perInput(corrente.ends_at)}
            className={CAMPO}
          />
        </div>
      </div>
      <p className="text-xs text-muted">
        Con una data di fine l&apos;annuncio sparisce da solo. Senza, resta
        finché non lo togli: un &laquo;Menu di San Valentino&raquo; ancora
        visibile a marzo fa più danno che altro.
      </p>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? "Salvataggio…" : "Salva annuncio"}
      </button>
    </form>
  );
}
