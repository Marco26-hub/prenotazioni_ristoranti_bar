"use client";

import { useActionState, useState, useTransition } from "react";
import { salvaRt, generaCodiceAgente, type EsitoFiscale } from "./actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tComune } from "@repo/shared/i18n/comune";
import { tSoldi } from "@/i18n/soldi";

const CAMPO =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base";

/**
 * Come si collega il registratore.
 *
 * Due modi, e "manuale" non è quello sbagliato: è quello di chi non vuole
 * installare niente sulla cassa. Il gestionale gli prepara i numeri invece
 * di fingere di aver certificato.
 */
export function RtForm({
  attivo,
  modalita,
  matricola,
  marca,
  operatore,
  percorso,
  reparti,
  stacco,
  aliquote,
  haCodice,
  agenteVistoIl,
  agenteFermo,
}: {
  attivo: boolean;
  modalita: string;
  matricola: string;
  marca: string;
  operatore: number;
  percorso: string;
  /** Aliquota IVA → reparto della stampante. */
  reparti: Record<string, number>;
  /** Ora locale in cui finisce la giornata di servizio. */
  stacco: number;
  /** Le aliquote che compaiono davvero nel menu di questo locale. */
  aliquote: number[];
  haCodice: boolean;
  agenteVistoIl: string | null;
  agenteFermo: boolean;
}) {
  const lingua = useLingua();
  const t = tSoldi(lingua);
  const tc = tComune(lingua);
  const [state, azione, pending] = useActionState<EsitoFiscale | null, FormData>(
    async (_p, formData) => salvaRt(formData),
    null
  );
  const [acceso, setAcceso] = useState(attivo);
  const [modo, setModo] = useState(modalita);
  const [segreto, setSegreto] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [generando, start] = useTransition();

  return (
    <div className="space-y-4">
      <form id="rt" action={azione} className="space-y-3">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="attivo"
            defaultChecked={attivo}
            onChange={(e) => setAcceso(e.target.checked)}
            className="h-4 w-4"
          />
          {t("rt.coda")}
        </label>

        {acceso && (
          <>
            <div>
              <label className="mb-1 block text-sm" htmlFor="matricola">
                {t("rt.matricola.etichetta")}
              </label>
              <input
                id="matricola"
                name="matricola"
                defaultValue={matricola}
                placeholder={t("rt.matricola.segnaposto")}
                className={CAMPO}
              />
              <p className="mt-1 text-xs text-muted">{t("rt.matricola.aiuto")}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm" htmlFor="stacco">
                {t("rt.stacco.etichetta")}
              </label>
              <select
                id="stacco"
                name="stacco"
                defaultValue={String(stacco)}
                className={CAMPO}
              >
                {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">{t("rt.stacco.aiuto")}</p>
            </div>

            <fieldset className="space-y-1">
              <legend className="mb-1 text-sm font-medium">{t("rt.come.legenda")}</legend>
              {[
                [
                  "agente",
                  t("rt.modo.agente.titolo"),
                  t("rt.modo.agente.testo"),
                ],
                [
                  "manuale",
                  t("rt.modo.manuale.titolo"),
                  t("rt.modo.manuale.testo"),
                ],
              ].map(([valore, titolo, spiegazione]) => (
                <label
                  key={valore}
                  className="flex gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="modalita"
                    value={valore}
                    checked={modo === valore}
                    onChange={() => setModo(valore)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="font-medium">{titolo}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {spiegazione}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          </>
        )}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? t("rt.salva.corso") : tc("azione.salva")}
        </button>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.ok && <p className="text-sm text-success">{state.ok}</p>}
      </form>

      {acceso && modo === "agente" && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <div>
            <label className="mb-1 block text-sm" htmlFor="marca">
              {t("rt.marca.etichetta")}
            </label>
            <select id="marca" name="marca" defaultValue={marca} className={CAMPO} form="rt">
              <option value="epson">Epson</option>
              <option value="custom">Custom</option>
              <option value="rch">RCH</option>
            </select>
            <p className="mt-1 text-xs text-muted">{t("rt.marca.aiuto")}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="operatore">
                {t("rt.operatore.etichetta")}
              </label>
              <input
                id="operatore"
                name="operatore"
                type="number"
                min="1"
                max="99"
                defaultValue={operatore}
                className={CAMPO}
                form="rt"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="percorso">
                {t("rt.percorso.etichetta")}
              </label>
              <input
                id="percorso"
                name="percorso"
                defaultValue={percorso}
                placeholder={t("rt.percorso.segnaposto")}
                className={CAMPO}
                form="rt"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">{t("rt.reparti.titolo")}</p>
            <p className="mt-0.5 text-xs text-muted">{t("rt.reparti.aiuto")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(aliquote.length > 0 ? aliquote : [4, 10, 22]).map((a) => (
                <label key={a} className="text-xs font-medium text-muted">
                  {t("rt.reparti.aliquota", { aliquota: a })}
                  <input
                    name={`reparto-${a}`}
                    type="number"
                    min="1"
                    max="99"
                    defaultValue={reparti[String(a)] ?? ""}
                    placeholder={t("rt.reparti.segnaposto")}
                    className={`${CAMPO} mt-1`}
                    form="rt"
                  />
                </label>
              ))}
            </div>
            {aliquote.length > 0 && (
              <p className="mt-1 text-xs text-muted">{t("rt.reparti.dal_menu")}</p>
            )}
          </div>

          <p className="text-sm font-medium">{t("rt.codice.titolo")}</p>

          {haCodice && (
            <p className="mt-1 text-xs text-muted">
              {agenteFermo ? (
                <span className="text-danger">
                  {agenteVistoIl
                    ? t("rt.cassa.ferma.da", { quando: agenteVistoIl })
                    : t("rt.cassa.ferma.mai")}
                </span>
              ) : (
                <>{t("rt.cassa.collegata", { quando: agenteVistoIl ?? "" })}</>
              )}
            </p>
          )}

          <button
            type="button"
            disabled={generando}
            onClick={() =>
              start(async () => {
                const r = await generaCodiceAgente();
                setSegreto(r.segreto ?? null);
                setAvviso(r.error ?? r.ok ?? null);
              })
            }
            className="mt-2 min-h-11 rounded-full border border-border px-5 text-sm disabled:opacity-60"
          >
            {generando
              ? t("rt.codice.corso")
              : haCodice
                ? t("rt.codice.rigenera")
                : t("rt.codice.genera")}
          </button>

          {haCodice && !segreto && (
            <p className="mt-1 text-xs text-muted">{t("rt.codice.rigenera.aiuto")}</p>
          )}

          {segreto && (
            <div className="mt-2">
              <p className="text-xs text-danger">{t("rt.codice.copia")}</p>
              <code className="mt-1 block overflow-x-auto rounded-lg bg-background p-3 text-xs">
                {segreto}
              </code>
            </div>
          )}

          {avviso && !segreto && <p className="mt-2 text-sm">{avviso}</p>}
        </div>
      )}
    </div>
  );
}
