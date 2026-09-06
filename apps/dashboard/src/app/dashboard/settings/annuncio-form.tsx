"use client";

import { useActionState } from "react";
import { salvaAnnuncio, type AnnuncioResult } from "./annuncio-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";
import { tComune } from "@repo/shared/i18n/comune";

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
  const t = tImpostazioni(useLingua());
  const c = tComune(useLingua());
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
        {t("annuncio.mostra")}
      </label>

      <div>
        <label className={ETICHETTA} htmlFor="ann-title">
          {t("annuncio.titolo")}
        </label>
        <input
          id="ann-title"
          name="title"
          maxLength={80}
          defaultValue={corrente.title ?? ""}
          placeholder={t("annuncio.titolo.placeholder")}
          className={CAMPO}
        />
      </div>

      <div>
        <label className={ETICHETTA} htmlFor="ann-body">
          {t("annuncio.testo")}
        </label>
        <textarea
          id="ann-body"
          name="body"
          rows={4}
          maxLength={600}
          defaultValue={corrente.body ?? ""}
          placeholder={t("annuncio.testo.placeholder")}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted">{t("annuncio.testo.nota")}</p>
      </div>

      <div>
        <label className={ETICHETTA} htmlFor="ann-image">
          {t("annuncio.immagine")}
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
              {c("azione.rimuovi")}
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
        <p className="mt-1 text-xs text-muted">{t("annuncio.immagine.nota")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={ETICHETTA} htmlFor="ann-cta-label">
            {t("annuncio.cta.testo")}
          </label>
          <input
            id="ann-cta-label"
            name="ctaLabel"
            maxLength={40}
            defaultValue={corrente.cta_label ?? ""}
            placeholder={t("annuncio.cta.testo.placeholder")}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={ETICHETTA} htmlFor="ann-cta-url">
            {t("annuncio.cta.link")}
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
            {t("annuncio.da")}
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
            {t("annuncio.a")}
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
      <p className="text-xs text-muted">{t("annuncio.date.nota")}</p>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? t("stato.salvataggio") : t("annuncio.salva")}
      </button>
    </form>
  );
}
