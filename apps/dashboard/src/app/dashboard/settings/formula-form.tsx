"use client";

import { useActionState, useState } from "react";
import { salvaFormula, type EsitoFormula } from "./formula-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";

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
  const t = tImpostazioni(useLingua());
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
        {t("formula.attiva")}
      </label>

      {accesa && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="f-pranzo">
                {t("formula.pranzo")}
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
                {t("formula.cena")}
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
              {t("formula.ora")}
            </label>
            <input
              id="f-ora"
              name="oraCena"
              type="time"
              defaultValue={oraCena.slice(0, 5)}
              className={`${CAMPO} sm:w-40`}
            />
            <p className="mt-1 text-xs text-muted">{t("formula.ora.nota")}</p>
          </div>

          <fieldset>
            <legend className="mb-1 text-sm">{t("formula.bambini")}</legend>
            <div className="space-y-1">
              {[
                ["adulti", t("formula.bambini.adulti")],
                ["gratis", t("formula.bambini.gratis")],
                ["ridotto", t("formula.bambini.ridotto")],
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
                  {t("formula.bambino.tariffa")}
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
                  {t("formula.eta")}
                </label>
                <input
                  id="f-eta"
                  name="etaMax"
                  type="number"
                  min="0"
                  max="17"
                  defaultValue={etaMax ?? ""}
                  placeholder={t("formula.eta.placeholder")}
                  className={`${CAMPO} sm:w-40`}
                />
                <p className="mt-1 text-xs text-muted">{t("formula.eta.nota")}</p>
              </div>
            )}
          </fieldset>

          <div>
            <label className="mb-1 block text-sm" htmlFor="f-suppl">
              {t("formula.supplemento")}
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
              {t("formula.supplemento.nota.prima")}{" "}
              <strong>{t("formula.supplemento.nota.forte")}</strong>{" "}
              {t("formula.supplemento.nota.dopo")}
            </p>
          </div>

          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="predefinita"
              defaultChecked={predefinita}
              className="h-4 w-4"
            />
            {t("formula.predefinita")}
          </label>

          <div>
            <label className="mb-1 block text-sm" htmlFor="f-nota">
              {t("formula.nota")}
            </label>
            <textarea
              id="f-nota"
              name="nota"
              rows={2}
              maxLength={500}
              defaultValue={nota}
              placeholder={t("formula.nota.placeholder")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
            />
          </div>

          <p className="rounded-lg bg-background p-3 text-xs text-muted">
            {t("formula.fuori.prima")}{" "}
            <strong>{t("formula.fuori.forte")}</strong>
            {t("formula.fuori.dopo")}
          </p>
        </>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? t("stato.salvo") : t("formula.salva")}
      </button>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}
    </form>
  );
}
