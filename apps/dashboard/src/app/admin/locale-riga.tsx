"use client";

import { useState, useTransition } from "react";
import { impostaModuli, impostaAbbonamento, creaTitolare } from "./actions";

export interface LocaleAdmin {
  id: string;
  nome: string;
  slug: string;
  stato: string;
  scadenza: string | null;
  /** Calcolati dal database: un orologio solo, e il render resta puro. */
  giorniResidui: number | null;
  pagaConCarta: boolean;
  moduli: string[];
  tavoli: number;
  piatti: number;
  interventi: { chi: string; azione: string; dettaglio: string | null; quando: string }[];
}

const MODULI: Array<[string, string]> = [
  ["ordini", "Ordini e pagamenti"],
  ["prenotazioni", "Prenotazioni"],
];

const STATI: Array<[string, string]> = [
  ["active", "Attivo"],
  ["trialing", "In prova"],
  ["past_due", "Insoluto"],
  ["canceled", "Disdetto"],
  ["none", "Mai attivato"],
];

const CAMPO = "min-h-11 rounded-lg border border-border bg-background px-3 text-sm";

export function LocaleRiga({ locale }: { locale: LocaleAdmin }) {
  const [aperto, setAperto] = useState(false);
  const [moduli, setModuli] = useState<string[]>(locale.moduli);
  const [stato, setStato] = useState(locale.stato);
  const [giorni, setGiorni] = useState(30);
  const [nota, setNota] = useState("");
  const [avviso, setAvviso] = useState<string | null>(null);
  const [nomeTitolare, setNomeTitolare] = useState("");
  const [mailTitolare, setMailTitolare] = useState("");
  // Mostrata una volta sola: non è salvata in chiaro da nessuna parte.
  const [passwordUnaVolta, setPasswordUnaVolta] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const residui = locale.giorniResidui;
  const scaduto = residui !== null && residui < 0;

  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {locale.nome}{" "}
            <span className="text-sm font-normal text-muted">/{locale.slug}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {locale.moduli.length > 0
              ? locale.moduli.join(" + ")
              : "nessun modulo attivo"}
            {" · "}
            {STATI.find(([k]) => k === locale.stato)?.[1] ?? locale.stato}
            {residui !== null &&
              (scaduto
                ? ` · scaduto da ${Math.abs(residui)} giorni`
                : ` · ancora ${residui} giorni`)}
            {locale.pagaConCarta && " · paga con carta"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {locale.tavoli} tavoli · {locale.piatti} piatti a menu
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAperto((v) => !v)}
          className="min-h-11 shrink-0 rounded-full border border-border px-4 text-sm"
        >
          {aperto ? "Chiudi" : "Gestisci"}
        </button>
      </div>

      {aperto && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {locale.pagaConCarta && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Questo locale ha un abbonamento attivo su Stripe. Se lo modifichi
              qui, il prossimo evento di Stripe riscriverà quello che hai messo:
              per un cambio permanente si interviene sull&apos;abbonamento, non qui.
            </p>
          )}

          <div>
            <p className="text-sm font-medium">Moduli</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {MODULI.map(([chiave, etichetta]) => {
                const on = moduli.includes(chiave);
                return (
                  <li key={chiave}>
                    <label
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${
                        on ? "border-accent bg-accent/15" : "border-border"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setModuli((p) =>
                            p.includes(chiave) ? p.filter((x) => x !== chiave) : [...p, chiave]
                          )
                        }
                        className="h-4 w-4"
                      />
                      {etichetta}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-muted">
              Stato
              <select
                value={stato}
                onChange={(e) => setStato(e.target.value)}
                className={`${CAMPO} mt-1 block w-44`}
              >
                {STATI.map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-muted">
              Giorni
              <input
                type="number"
                min={0}
                max={1095}
                value={giorni}
                onChange={(e) => setGiorni(Number(e.target.value))}
                className={`${CAMPO} mt-1 block w-24`}
              />
            </label>
            <label className="min-w-40 flex-1 text-xs font-medium text-muted">
              Perché
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Bonifico ricevuto, prova concordata…"
                maxLength={200}
                className={`${CAMPO} mt-1 block w-full`}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await impostaModuli(locale.id, moduli, nota);
                  setAvviso(r.error ?? r.ok ?? null);
                })
              }
              className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
            >
              Salva moduli
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await impostaAbbonamento(locale.id, stato, giorni, nota);
                  setAvviso(r.error ?? r.ok ?? null);
                })
              }
              className="min-h-11 rounded-full border border-border px-5 text-sm font-medium disabled:opacity-60"
            >
              Salva abbonamento
            </button>
          </div>

          {avviso && (
            <p role="status" className="text-sm font-medium">
              {avviso}
            </p>
          )}

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium">Titolare</p>
            <p className="mt-0.5 text-xs text-muted">
              Crea l&apos;accesso mentre sei al telefono con lui: chiedergli di
              registrarsi da solo ne fa perdere una parte al primo modulo. La
              password iniziale la generiamo noi e si vede una volta sola.
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-xs font-medium text-muted">
                Nome
                <input
                  value={nomeTitolare}
                  onChange={(e) => setNomeTitolare(e.target.value)}
                  placeholder="Luca Rossi"
                  className={`${CAMPO} mt-1 block w-40`}
                />
              </label>
              <label className="min-w-48 flex-1 text-xs font-medium text-muted">
                Email
                <input
                  type="email"
                  value={mailTitolare}
                  onChange={(e) => setMailTitolare(e.target.value)}
                  placeholder="luca@trattoria.it"
                  className={`${CAMPO} mt-1 block w-full`}
                />
              </label>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await creaTitolare(locale.id, nomeTitolare, mailTitolare);
                    setAvviso(r.error ?? r.ok ?? null);
                    setPasswordUnaVolta(r.password ?? null);
                    if (!r.error) {
                      setNomeTitolare("");
                      setMailTitolare("");
                    }
                  })
                }
                className="min-h-11 rounded-full border border-accent px-4 text-sm font-medium disabled:opacity-60"
              >
                Crea accesso
              </button>
            </div>

            {passwordUnaVolta && (
              <p className="mt-2 rounded-lg border border-accent bg-accent/10 p-3 text-sm">
                Password iniziale, <strong>scrivila adesso</strong> — non
                ricompare:{" "}
                <code className="rounded bg-background px-2 py-0.5 text-base font-semibold tracking-wider">
                  {passwordUnaVolta}
                </code>
                <span className="mt-1 block text-xs text-muted">
                  Al primo accesso gli verrà chiesto di cambiarla.
                </span>
              </p>
            )}
          </div>

          {locale.interventi.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Interventi a mano
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-muted">
                {locale.interventi.map((e, i) => (
                  <li key={i}>
                    {new Intl.DateTimeFormat("it-IT", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(e.quando))}{" "}
                    · {e.chi} · {e.azione}
                    {e.dettaglio && ` — ${e.dettaglio}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
