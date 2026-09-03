"use client";

import { useActionState, useState } from "react";
import { salvaFormula, type EsitoFormula } from "./formula-actions";

const CAMPO =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base";

/**
 * La formula a prezzo fisso.
 *
 * I campi compaiono a mano a mano che servono: chi non usa la formula vede
 * una casella e basta, e chi la usa non deve indovinare quali dei dieci
 * campi lo riguardano.
 */
export function FormulaForm({
  attiva,
  predefinita,
  pranzoCents,
  cenaCents,
  oraCena,
  bambinoCents,
  etaMax,
  supplementoCents,
  nota,
}: {
  attiva: boolean;
  predefinita: boolean;
  pranzoCents: number;
  cenaCents: number;
  oraCena: string;
  /** null = i bambini pagano come gli adulti. 0 = gratis. */
  bambinoCents: number | null;
  etaMax: number | null;
  supplementoCents: number;
  nota: string;
}) {
  const [state, azione, pending] = useActionState<EsitoFormula | null, FormData>(
    async (_prec, formData) => salvaFormula(formData),
    null
  );

  const [accesa, setAccesa] = useState(attiva);
  const [modo, setModo] = useState(
    bambinoCents === null ? "adulti" : bambinoCents === 0 ? "gratis" : "ridotto"
  );

  const euro = (c: number) => (c / 100).toFixed(2);

  return (
    <form action={azione} className="space-y-3">
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="attiva"
          defaultChecked={attiva}
          onChange={(e) => setAccesa(e.target.checked)}
          className="h-4 w-4"
        />
        Il locale propone una formula a prezzo fisso
      </label>

      {accesa && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="f-pranzo">
                Prezzo a persona, pranzo (€)
              </label>
              <input
                id="f-pranzo"
                name="pranzo"
                type="number"
                step="0.01"
                min="0"
                max="500"
                defaultValue={euro(pranzoCents)}
                className={CAMPO}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="f-cena">
                Prezzo a persona, cena (€)
              </label>
              <input
                id="f-cena"
                name="cena"
                type="number"
                step="0.01"
                min="0"
                max="500"
                defaultValue={euro(cenaCents)}
                className={CAMPO}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm" htmlFor="f-ora">
              Da che ora vale il prezzo di cena
            </label>
            <input
              id="f-ora"
              name="oraCena"
              type="time"
              defaultValue={oraCena.slice(0, 5)}
              className={`${CAMPO} sm:w-40`}
            />
            <p className="mt-1 text-xs text-muted">
              Conta l&apos;ora in cui il tavolo si è seduto, non quella in cui
              chiede il conto: chi si siede alle 12:30 paga il pranzo anche se
              esce alle 17.
            </p>
          </div>

          <fieldset>
            <legend className="mb-1 text-sm">I bambini</legend>
            <div className="space-y-1">
              {[
                ["adulti", "Pagano come gli adulti"],
                ["gratis", "Non pagano"],
                ["ridotto", "Pagano una tariffa ridotta"],
              ].map(([valore, etichetta]) => (
                <label
                  key={valore}
                  className="flex min-h-11 items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="modoBambini"
                    value={valore}
                    checked={modo === valore}
                    onChange={() => setModo(valore)}
                    className="h-4 w-4"
                  />
                  {etichetta}
                </label>
              ))}
            </div>

            {modo === "ridotto" && (
              <div className="mt-2">
                <label className="mb-1 block text-sm" htmlFor="f-bambino">
                  Tariffa bambino (€)
                </label>
                <input
                  id="f-bambino"
                  name="bambino"
                  type="number"
                  step="0.01"
                  min="0"
                  max="500"
                  defaultValue={euro(bambinoCents && bambinoCents > 0 ? bambinoCents : 0)}
                  className={`${CAMPO} sm:w-40`}
                />
              </div>
            )}

            {modo !== "adulti" && (
              <div className="mt-2">
                <label className="mb-1 block text-sm" htmlFor="f-eta">
                  Fino a che età (anni)
                </label>
                <input
                  id="f-eta"
                  name="etaMax"
                  type="number"
                  min="0"
                  max="17"
                  defaultValue={etaMax ?? ""}
                  placeholder="es. 10"
                  className={`${CAMPO} sm:w-40`}
                />
                <p className="mt-1 text-xs text-muted">
                  Serve a scriverlo sul menu. Senza una soglia dichiarata, due
                  tavoli identici pagano diverso a seconda di chi li serve.
                </p>
              </div>
            )}
          </fieldset>

          <div>
            <label className="mb-1 block text-sm" htmlFor="f-suppl">
              Supplemento per l&apos;avanzato (€)
            </label>
            <input
              id="f-suppl"
              name="supplemento"
              type="number"
              step="0.01"
              min="0"
              max="500"
              defaultValue={euro(supplementoCents)}
              className={`${CAMPO} sm:w-40`}
            />
            <p className="mt-1 text-xs text-muted">
              Lo aggiunge il cameriere alla chiusura, guardando il tavolo:
              nessun programma può sapere quanto è rimasto nel piatto. Va
              scritto sul menu <strong>prima</strong> che si ordini — se compare
              solo sul conto è una condizione che il cliente non ha accettato.
              0 = non lo applichi.
            </p>
          </div>

          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="predefinita"
              defaultChecked={predefinita}
              className="h-4 w-4"
            />
            I nuovi tavoli partono già a formula
          </label>

          <div>
            <label className="mb-1 block text-sm" htmlFor="f-nota">
              Cosa comprende, per il cliente
            </label>
            <textarea
              id="f-nota"
              name="nota"
              rows={2}
              maxLength={500}
              defaultValue={nota}
              placeholder="Tutto il menu esclusi dolci, caffè, amari e bevande. Ordinazioni a ondate."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
            />
          </div>

          <p className="rounded-lg bg-background p-3 text-xs text-muted">
            Le voci che restano a pagamento si segnano una per una nel menu, con
            la spunta <strong>Fuori formula</strong>: dolci, caffè, amari,
            bevande e i piatti premium.
          </p>
        </>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Salvo…" : "Salva formula"}
      </button>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}
    </form>
  );
}
