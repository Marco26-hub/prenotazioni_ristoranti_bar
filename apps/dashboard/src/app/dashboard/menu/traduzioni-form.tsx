"use client";

import { useState, useTransition } from "react";
import { LINGUE, type Traduzioni } from "@repo/shared/lingue";
import { salvaTraduzione } from "./traduzioni-actions";

const CAMPO =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

/**
 * Traduzioni di un piatto.
 *
 * Chiuso di default e una lingua per volta: un ristoratore traduce tutto il
 * menu in inglese, poi eventualmente tutto in tedesco. Mostrare sei lingue
 * insieme su ogni piatto renderebbe la pagina illeggibile.
 */
export function TraduzioniForm({
  itemId,
  nomeItaliano,
  descrizioneItaliana,
  lingueAttive,
  traduzioni,
}: {
  itemId: string;
  nomeItaliano: string;
  descrizioneItaliana: string | null;
  lingueAttive: string[];
  traduzioni: Traduzioni;
}) {
  const [aperta, setAperta] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [esito, setEsito] = useState<string | null>(null);

  if (lingueAttive.length === 0) return null;

  const tradotte = lingueAttive.filter((c) => traduzioni[c]?.name?.trim());

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Lingue</span>
        {lingueAttive.map((codice) => {
          const l = LINGUE.find((x) => x.codice === codice);
          const fatta = tradotte.includes(codice);
          return (
            <button
              key={codice}
              type="button"
              onClick={() => {
                setEsito(null);
                setAperta(aperta === codice ? null : codice);
              }}
              className={`flex min-h-11 items-center rounded-full px-3 text-xs ${
                aperta === codice
                  ? "bg-accent text-accent-foreground"
                  : fatta
                    ? "border border-success text-success"
                    : "border border-amber-400 text-amber-700"
              }`}
            >
              {l?.nativo ?? codice}
              {!fatta && " ·"}
            </button>
          );
        })}
      </div>

      {aperta && (
        <form
          action={(formData) => {
            start(async () => {
              const r = await salvaTraduzione(formData);
              setEsito(r.error ?? r.success ?? null);
            });
          }}
          className="mt-3 space-y-2 rounded-lg border border-border p-3"
        >
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="lingua" value={aperta} />

          <div>
            <label className="mb-1 block text-xs text-muted">
              Nome — in italiano: {nomeItaliano}
            </label>
            <input
              name="name"
              defaultValue={traduzioni[aperta]?.name ?? ""}
              className={CAMPO}
            />
          </div>

          {descrizioneItaliana && (
            <div>
              <label className="mb-1 block text-xs text-muted">
                Descrizione — in italiano: {descrizioneItaliana}
              </label>
              <textarea
                name="description"
                rows={2}
                defaultValue={traduzioni[aperta]?.description ?? ""}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted">Ingredienti</label>
            <textarea
              name="ingredients"
              rows={2}
              defaultValue={traduzioni[aperta]?.ingredients ?? ""}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <p className="text-xs text-muted">
            I campi lasciati vuoti restano in italiano: meglio del nulla, per
            chi legge.
          </p>

          {esito && <p className="text-xs text-muted">{esito}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-60"
            >
              {pending ? "Salvo…" : "Salva traduzione"}
            </button>
            <button
              type="button"
              onClick={() => setAperta(null)}
              className="flex min-h-11 items-center px-3 text-sm underline"
            >
              Chiudi
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
