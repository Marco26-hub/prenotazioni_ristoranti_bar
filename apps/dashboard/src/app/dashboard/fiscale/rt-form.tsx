"use client";

import { useActionState, useState, useTransition } from "react";
import { salvaRt, generaCodiceAgente, type EsitoFiscale } from "./actions";

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
          Metti in coda un documento commerciale a ogni conto chiuso
        </label>

        {acceso && (
          <>
            <div>
              <label className="mb-1 block text-sm" htmlFor="matricola">
                Matricola del registratore
              </label>
              <input
                id="matricola"
                name="matricola"
                defaultValue={matricola}
                placeholder="es. 99XXX1234567"
                className={CAMPO}
              />
              <p className="mt-1 text-xs text-muted">
                È quella che hai comunicato all&apos;Agenzia collegando il POS
                al registratore.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm" htmlFor="stacco">
                A che ora finisce la giornata di servizio
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
              <p className="mt-1 text-xs text-muted">
                I corrispettivi si chiudono per giornata di servizio, non a
                mezzanotte: chi chiude alle due mette le 5:00. Un bar che apre
                alle sei mette un&apos;ora prima, o i primi caffè finiscono
                nella giornata di ieri.
              </p>
            </div>

            <fieldset className="space-y-1">
              <legend className="mb-1 text-sm font-medium">Come si emette</legend>
              {[
                [
                  "agente",
                  "Un programma sulla cassa",
                  "Gira sul computer del locale, prende i documenti dalla coda e li fa stampare al registratore. La stampante sta sulla tua rete e da qui non la raggiungiamo: serve qualcosa lì.",
                ],
                [
                  "manuale",
                  "Li batto io in cassa",
                  "Il gestionale non emette niente: ti prepara il riepilogo di giornata per metodo di pagamento, e tu lo batti come hai sempre fatto.",
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
          {pending ? "Salvo…" : "Salva"}
        </button>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.ok && <p className="text-sm text-success">{state.ok}</p>}
      </form>

      {acceso && modo === "agente" && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <div>
            <label className="mb-1 block text-sm" htmlFor="marca">
              Marca della stampante fiscale
            </label>
            <select id="marca" name="marca" defaultValue={marca} className={CAMPO} form="rt">
              <option value="epson">Epson</option>
              <option value="custom">Custom</option>
              <option value="rch">RCH</option>
            </select>
            <p className="mt-1 text-xs text-muted">
              Parlano dialetti diversi. Se non sai quale hai, c&apos;è scritto
              sulla stampante.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="operatore">
                Numero operatore
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
                Percorso, se il modello lo cambia
              </label>
              <input
                id="percorso"
                name="percorso"
                defaultValue={percorso}
                placeholder="lascia vuoto"
                className={CAMPO}
                form="rt"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Reparti IVA</p>
            <p className="mt-0.5 text-xs text-muted">
              Sulla stampante ogni aliquota sta su un reparto numerato, e la
              numerazione l&apos;ha decisa chi l&apos;ha configurata. Mandare
              tutto sul reparto 1 vuol dire dichiarare tutto con
              l&apos;aliquota di quel reparto: nessun errore a schermo, un
              errore fiscale in silenzio.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(aliquote.length > 0 ? aliquote : [4, 10, 22]).map((a) => (
                <label key={a} className="text-xs font-medium text-muted">
                  IVA {a}%
                  <input
                    name={`reparto-${a}`}
                    type="number"
                    min="1"
                    max="99"
                    defaultValue={reparti[String(a)] ?? ""}
                    placeholder="reparto"
                    className={`${CAMPO} mt-1`}
                    form="rt"
                  />
                </label>
              ))}
            </div>
            {aliquote.length > 0 && (
              <p className="mt-1 text-xs text-muted">
                Queste sono le aliquote che compaiono davvero nel tuo menu.
              </p>
            )}
          </div>

          <p className="text-sm font-medium">Codice per il programma sulla cassa</p>

          {haCodice && (
            <p className="mt-1 text-xs text-muted">
              {agenteFermo ? (
                <span className="text-danger">
                  La cassa non si fa sentire
                  {agenteVistoIl ? ` dalle ${agenteVistoIl}` : " da quando hai generato il codice"}:
                  i documenti restano in coda. Controlla che il programma sia
                  acceso.
                </span>
              ) : (
                <>Cassa collegata, ultimo contatto {agenteVistoIl}.</>
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
              ? "Genero…"
              : haCodice
                ? "Genera un codice nuovo"
                : "Genera il codice"}
          </button>

          {haCodice && !segreto && (
            <p className="mt-1 text-xs text-muted">
              Generarne uno nuovo spegne il precedente: è il modo di togliere
              l&apos;accesso a un computer che non c&apos;è più.
            </p>
          )}

          {segreto && (
            <div className="mt-2">
              <p className="text-xs text-danger">
                Copialo adesso: non si può rivedere.
              </p>
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
