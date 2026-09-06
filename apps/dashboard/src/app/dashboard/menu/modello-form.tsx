"use client";

import { useState, useTransition } from "react";
import { MODELLI, type TipoLocale } from "@repo/shared/formati";
import { applicaModello, type EsitoModello } from "./modello-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tMenuAdmin, promemoriaTradotto } from "@/i18n/menu";

/**
 * Scelta del formato di locale.
 *
 * Il valore non è tanto creare le categorie — quelle si scrivono a mano in
 * cinque minuti — quanto i promemoria: sono le cose per cui quel formato
 * specifico prende una sanzione o perde un cliente, e nessuno le ha in
 * testa mentre carica il menu.
 */
export function ModelloForm({ tipoAttuale }: { tipoAttuale: string }) {
  const lingua = useLingua();
  const t = tMenuAdmin(lingua);
  const [scelto, setScelto] = useState<TipoLocale | null>(null);
  const [pending, start] = useTransition();
  const [esito, setEsito] = useState<EsitoModello | null>(null);

  const modello = MODELLI.find((m) => m.tipo === (scelto ?? tipoAttuale));

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {MODELLI.map((m) => {
          const attivo = (scelto ?? tipoAttuale) === m.tipo;
          return (
            <button
              key={m.tipo}
              type="button"
              onClick={() => {
                setScelto(m.tipo);
                setEsito(null);
              }}
              className={`rounded-xl border p-3 text-left ${
                attivo ? "border-accent bg-accent/10" : "border-border"
              }`}
            >
              <p className="text-sm font-medium">{t(`formato.${m.tipo}.nome`)}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted">
                {t(`formato.${m.tipo}.descrizione`)}
              </p>
            </button>
          );
        })}
      </div>

      {modello && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div>
            <p className="text-sm font-medium">{t("formato.categorie")}</p>
            <p className="mt-1 text-sm text-muted">{modello.categorie.map((c) => c.nome).join(" · ")}</p>
          </div>

          {modello.gruppi.length > 0 && (
            <div>
              <p className="text-sm font-medium">{t("formato.scelte")}</p>
              <ul className="mt-1 space-y-1 text-sm text-muted">
                {modello.gruppi.map((g) => (
                  <li key={g.nome}>
                    <strong className="font-medium text-foreground">{g.nome}</strong>{" "}
                    {g.tipo === "rimozione"
                      ? t("formato.gruppo.rimozione")
                      : g.tipo === "aggiunta"
                        ? t("formato.gruppo.aggiunta")
                        : g.obbligatorio
                          ? t("formato.gruppo.obbligatorio")
                          : t("formato.gruppo.facoltativo")}
                    : {g.opzioni.map(([n]) => n).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">
              {t("formato.promemoria.titolo")}
            </p>
            <ul className="mt-1 space-y-1 text-sm text-amber-900">
              {modello.promemoria.map((p) => (
                <li key={p}>— {promemoriaTradotto(p, lingua)}</li>
              ))}
            </ul>
          </div>

          {scelto && (
            <form
              action={(fd) => {
                start(async () => setEsito(await applicaModello(fd)));
              }}
              className="space-y-2"
            >
              <input type="hidden" name="tipo" value={scelto} />

              <label className="flex min-h-11 items-start gap-2 text-sm">
                <input type="checkbox" name="soloCategorie" className="mt-0.5 h-5 w-5" />
                <span>
                  {t("formato.solo.categorie")}
                  <span className="block text-xs text-muted">
                    {t("formato.solo.categorie.nota")}
                  </span>
                </span>
              </label>

              {(modello.piatti?.length ?? 0) > 0 && (
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="conListino"
                    className="mt-0.5 h-5 w-5"
                  />
                  <span>
                    {t("formato.listino", { n: modello.piatti!.length })}
                    <span className="block text-xs text-muted">
                      {t("formato.listino.nota.prima")}
                      <strong>{t("formato.listino.nota.spente")}</strong>
                      {t("formato.listino.nota.dopo")}
                    </span>
                  </span>
                </label>
              )}

              <p className="text-xs text-muted">{t("formato.nota")}</p>

              <button
                type="submit"
                disabled={pending}
                className="min-h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground disabled:opacity-60"
              >
                {pending
                  ? t("formato.applico")
                  : t("formato.applica", { nome: t(`formato.${modello.tipo}.nome`) })}
              </button>
            </form>
          )}

          {esito?.error && <p className="text-sm text-danger">{esito.error}</p>}
          {esito?.success && <p className="text-sm text-success">{esito.success}</p>}
        </div>
      )}
    </div>
  );
}
