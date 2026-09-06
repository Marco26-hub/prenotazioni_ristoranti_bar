"use client";

import { useState, useTransition } from "react";
import {
  creaGruppo,
  eliminaGruppo,
  creaOpzione,
  eliminaOpzione,
  commutaOpzione,
} from "./varianti-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tComune } from "@repo/shared/i18n/comune";
import { tMenuAdmin } from "@/i18n/menu";

export interface OpzioneAdmin {
  id: string;
  name: string;
  price_delta_cents: number;
  available: boolean;
}

export interface GruppoAdmin {
  id: string;
  name: string;
  kind?: "scelta" | "aggiunta" | "rimozione";
  required: boolean;
  max_choices: number;
  opzioni: OpzioneAdmin[];
}

const CAMPO = "min-h-11 rounded-lg border border-border bg-background px-3 text-sm";

/**
 * Varianti e aggiunte di un piatto.
 *
 * Chiuso di default: la maggior parte dei piatti non ne ha, e mostrarne la
 * configurazione su ognuno riempirebbe la pagina di cose che non servono.
 */
export function VariantiForm({
  itemId,
  gruppi,
}: {
  itemId: string;
  gruppi: GruppoAdmin[];
}) {
  const lingua = useLingua();
  const t = tMenuAdmin(lingua);
  const tc = tComune(lingua);
  const [aperto, setAperto] = useState(false);
  const [pending, start] = useTransition();
  const [esito, setEsito] = useState<string | null>(null);

  function esegui(fn: () => Promise<{ error?: string; success?: string }>) {
    setEsito(null);
    start(async () => {
      const r = await fn();
      setEsito(r.error ?? r.success ?? null);
    });
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="mt-3 flex min-h-11 items-center border-t border-border pt-3 text-sm underline"
      >
        {gruppi.length > 0
          ? t("varianti.apri.con", { n: gruppi.length })
          : t("varianti.apri.senza")}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <div>
        <h3 className="font-medium">{t("varianti.titolo")}</h3>
        <p className="mt-0.5 text-xs text-muted">
          {t("varianti.testo.prima")}
          <em>{t("varianti.testo.enfasi")}</em>
          {t("varianti.testo.dopo")}
        </p>
      </div>
      {gruppi.map((g) => (
        <div key={g.id} className="rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">
              {g.name}{" "}
              <span className="text-xs font-normal text-muted">
                {g.required ? t("varianti.obbligatorio") : t("varianti.facoltativo")}
                {g.max_choices > 1 ? t("varianti.multiple") : ""}
              </span>
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => esegui(() => eliminaGruppo(g.id))}
              className="flex min-h-11 items-center px-1 text-sm text-danger underline"
            >
              {t("varianti.elimina.gruppo")}
            </button>
          </div>

          <ul className="mt-2 space-y-1">
            {g.opzioni.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                <span className={o.available ? "" : "text-muted line-through"}>
                  {g.kind === "rimozione"
                    ? t("varianti.senza", { nome: o.name.toLowerCase() })
                    : o.name}
                  {o.price_delta_cents !== 0 && (
                    <span className="ml-2 tabular-nums text-muted">
                      {o.price_delta_cents > 0 ? "+" : "−"}
                      {t.prezzo(Math.abs(o.price_delta_cents))}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-x-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => esegui(() => commutaOpzione(o.id, !o.available))}
                    className="flex min-h-11 items-center px-1 text-xs underline"
                  >
                    {o.available ? t("varianti.esaurito") : t("varianti.ripristina")}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => esegui(() => eliminaOpzione(o.id))}
                    className="flex min-h-11 items-center px-1 text-xs text-danger underline"
                  >
                    {tc("azione.elimina")}
                  </button>
                </span>
              </li>
            ))}
            {g.opzioni.length === 0 && (
              <li className="text-sm text-muted">
                {t("varianti.vuoto")}
              </li>
            )}
          </ul>

          <form
            action={(fd) => esegui(() => creaOpzione(fd))}
            className="mt-2 flex flex-wrap gap-2"
          >
            <input type="hidden" name="groupId" value={g.id} />
            <input
              name="name"
              placeholder={t("varianti.opzione.segnaposto")}
              required
              className={`${CAMPO} w-full min-w-0 flex-1 sm:w-auto`}
            />
            <input
              name="delta"
              type="number"
              step="0.01"
              defaultValue={0}
              aria-label={t("varianti.supplemento")}
              className={`${CAMPO} w-24`}
            />
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-full border border-border px-4 text-sm"
            >
              {t("varianti.aggiungi.scelta")}
            </button>
          </form>
        </div>
      ))}

      <form
        action={(fd) => esegui(() => creaGruppo(fd))}
        className="space-y-2 rounded-lg border border-dashed border-border p-3"
      >
        <input type="hidden" name="itemId" value={itemId} />

        {/* Senza intestazione questo riquadro sembrava servisse ad aggiungere
            un piatto: chi lo apriva scriveva lì il nome di una portata. */}
        <div>
          <h4 className="font-medium">{t("varianti.nuovo.gruppo")}</h4>
          <p className="mt-0.5 text-xs text-muted">
            {t("varianti.nuovo.gruppo.testo.prima")}
            <em>{t("varianti.nuovo.gruppo.testo.enfasi")}</em>
            {t("varianti.nuovo.gruppo.testo.dopo")}
          </p>
        </div>

        <label className="block text-xs font-medium text-muted">
          {t("varianti.gruppo.nome")}
          <input
            name="name"
            placeholder={t("varianti.gruppo.nome.segnaposto")}
            required
            className={`${CAMPO} mt-1 w-full`}
          />
        </label>
        <label className="block text-xs font-medium text-muted">
          {t("varianti.gruppo.tipo")}
          <select
            name="kind"
            defaultValue="scelta"
            className={`${CAMPO} mt-1 w-full`}
          >
            <option value="scelta">{t("varianti.gruppo.tipo.scelta")}</option>
            <option value="aggiunta">{t("varianti.gruppo.tipo.aggiunta")}</option>
            <option value="rimozione">{t("varianti.gruppo.tipo.rimozione")}</option>
          </select>
        </label>

        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="required" className="h-5 w-5" />
            {t("varianti.gruppo.obbligatorio")}
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="multiple" className="h-5 w-5" />
            {t("varianti.gruppo.multiplo")}
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {t("varianti.gruppo.crea")}
        </button>
      </form>

      {esito && <p className="text-sm text-muted">{esito}</p>}

      <button
        type="button"
        onClick={() => setAperto(false)}
        className="flex min-h-11 items-center px-1 text-sm underline"
      >
        {tc("azione.chiudi")}
      </button>
    </div>
  );
}
