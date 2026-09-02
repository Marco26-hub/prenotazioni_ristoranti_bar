"use client";

import { useState, useTransition } from "react";
import { MODELLI, type TipoLocale } from "@repo/shared/formati";
import { applicaModello, type EsitoModello } from "./modello-actions";

/**
 * Scelta del formato di locale.
 *
 * Il valore non è tanto creare le categorie — quelle si scrivono a mano in
 * cinque minuti — quanto i promemoria: sono le cose per cui quel formato
 * specifico prende una sanzione o perde un cliente, e nessuno le ha in
 * testa mentre carica il menu.
 */
export function ModelloForm({ tipoAttuale }: { tipoAttuale: string }) {
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
              <p className="text-sm font-medium">{m.nome}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted">{m.descrizione}</p>
            </button>
          );
        })}
      </div>

      {modello && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div>
            <p className="text-sm font-medium">Categorie</p>
            <p className="mt-1 text-sm text-muted">{modello.categorie.join(" · ")}</p>
          </div>

          {modello.gruppi.length > 0 && (
            <div>
              <p className="text-sm font-medium">Scelte proposte</p>
              <ul className="mt-1 space-y-1 text-sm text-muted">
                {modello.gruppi.map((g) => (
                  <li key={g.nome}>
                    <strong className="font-medium text-foreground">{g.nome}</strong>{" "}
                    {g.tipo === "rimozione"
                      ? "— cosa togliere"
                      : g.tipo === "aggiunta"
                        ? "— aggiunte a pagamento"
                        : g.obbligatorio
                          ? "— obbligatorio"
                          : "— facoltativo"}
                    : {g.opzioni.map(([n]) => n).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">
              Da tenere a mente per questo formato
            </p>
            <ul className="mt-1 space-y-1 text-sm text-amber-900">
              {modello.promemoria.map((p) => (
                <li key={p}>— {p}</li>
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
                  Solo le categorie, senza le scelte
                  <span className="block text-xs text-muted">
                    Utile se le varianti le vuoi impostare tu piatto per piatto.
                  </span>
                </span>
              </label>

              <p className="text-xs text-muted">
                Non tocca nulla di quello che hai già: le categorie esistenti
                restano, e un gruppo di scelte con lo stesso nome non viene
                sovrascritto. Le scelte si applicano ai piatti già caricati
                nelle categorie previste.
              </p>

              <button
                type="submit"
                disabled={pending}
                className="min-h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground disabled:opacity-60"
              >
                {pending ? "Applico…" : `Applica il modello ${modello.nome}`}
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
