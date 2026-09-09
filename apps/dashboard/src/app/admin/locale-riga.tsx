"use client";

import { useState, useTransition } from "react";
import {
  impostaModuli,
  impostaAbbonamento,
  creaTitolare,
  salvaScheda,
  aggiungiNota,
  impostaFormato,
  impostaCommissione,
} from "./actions";
import { MODELLI } from "@repo/shared/formati";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tComune } from "@repo/shared/i18n/comune";
import { tSuperAdmin } from "@/i18n/superadmin";

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
  /** Formato già applicato, se ce n'è uno. */
  formato: string | null;
  /** Quanto tratteniamo sui pagamenti con carta di questo locale. */
  commissionePercent: string;
  scheda: {
    referente_nome: string;
    referente_telefono: string;
    referente_email: string;
    provenienza: string;
    ricontattare_il: string;
    motivo_abbandono: string;
  };
  note: { chi: string; testo: string; quando: string }[];
}

// A sinistra il valore a database, a destra la chiave del dizionario: il
// valore non si tocca, l'etichetta si traduce.
const MODULI: Array<
  [string, "modulo.ordini" | "modulo.prenotazioni" | "modulo.ritiro"]
> = [
  ["ordini", "modulo.ordini"],
  ["prenotazioni", "modulo.prenotazioni"],
  ["ritiro", "modulo.ritiro"],
];

type ChiaveStato =
  | "stato.active"
  | "stato.trialing"
  | "stato.past_due"
  | "stato.canceled"
  | "stato.none";

const STATI: Array<[string, ChiaveStato]> = [
  ["active", "stato.active"],
  ["trialing", "stato.trialing"],
  ["past_due", "stato.past_due"],
  ["canceled", "stato.canceled"],
  ["none", "stato.none"],
];

const CAMPO = "min-h-11 rounded-lg border border-border bg-background px-3 text-sm";

export function LocaleRiga({ locale }: { locale: LocaleAdmin }) {
  const lingua = useLingua();
  const t = tSuperAdmin(lingua);
  const tc = tComune(lingua);
  const [aperto, setAperto] = useState(false);
  const [moduli, setModuli] = useState<string[]>(locale.moduli);
  const [stato, setStato] = useState(locale.stato);
  // Vuoto di proposito: significa "non toccare la scadenza". Un valore
  // preimpostato qui riscriveva un abbonamento pagato a ogni cambio di stato.
  const [giorni, setGiorni] = useState("");
  const [nota, setNota] = useState("");
  const [avviso, setAvviso] = useState<string | null>(null);
  const [nomeTitolare, setNomeTitolare] = useState("");
  const [mailTitolare, setMailTitolare] = useState("");
  // Mostrata una volta sola: non è salvata in chiaro da nessuna parte.
  const [passwordUnaVolta, setPasswordUnaVolta] = useState<string | null>(null);
  const [scheda, setScheda] = useState(locale.scheda);
  const [commissione, setCommissione] = useState(locale.commissionePercent);
  const [nuovaNota, setNuovaNota] = useState("");
  const [formato, setFormato] = useState(locale.formato ?? "");
  const [soloCategorie, setSoloCategorie] = useState(false);
  const [conListino, setConListino] = useState(false);
  const [pending, start] = useTransition();

  const campo = (k: keyof typeof scheda) => ({
    value: scheda[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setScheda((p) => ({ ...p, [k]: e.target.value })),
  });

  const residui = locale.giorniResidui;
  const scaduto = residui !== null && residui < 0;
  const chiaveStato = STATI.find(([k]) => k === locale.stato)?.[1];

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
              : t("locale.nessun_modulo")}
            {" · "}
            {chiaveStato ? t(chiaveStato) : locale.stato}
            {residui !== null &&
              (scaduto
                ? t.n(Math.abs(residui), "locale.scaduto")
                : t.n(residui, "locale.residui"))}
            {locale.pagaConCarta && t("locale.carta")}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {t.n(locale.tavoli, "locale.tavoli")} ·{" "}
            {t.n(locale.piatti, "locale.piatti")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAperto((v) => !v)}
          className="min-h-11 shrink-0 rounded-full border border-border px-4 text-sm"
        >
          {aperto ? tc("azione.chiudi") : t("locale.gestisci")}
        </button>
      </div>

      {aperto && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {locale.pagaConCarta && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {t("locale.stripe")}
            </p>
          )}

          <div>
            <p className="text-sm font-medium">{t("moduli.titolo")}</p>
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
                      {t(etichetta)}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-muted">
              {t("abbonamento.stato")}
              <select
                value={stato}
                onChange={(e) => setStato(e.target.value)}
                className={`${CAMPO} mt-1 block w-44`}
              >
                {STATI.map(([k, etichetta]) => (
                  <option key={k} value={k}>
                    {t(etichetta)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-muted">
              {t("abbonamento.giorni")}
              <input
                type="number"
                min={0}
                max={1095}
                value={giorni}
                onChange={(e) => setGiorni(e.target.value)}
                placeholder={
                  residui === null ? t("abbonamento.giorni.vuoto") : String(residui)
                }
                className={`${CAMPO} mt-1 block w-24`}
              />
              <span className="mt-0.5 block font-normal">
                {t("abbonamento.giorni.nota")}
              </span>
            </label>
            <label className="min-w-40 flex-1 text-xs font-medium text-muted">
              {t("abbonamento.perche")}
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder={t("abbonamento.perche.placeholder")}
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
              {t("abbonamento.salva_moduli")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await impostaAbbonamento(
                    locale.id,
                    stato,
                    giorni.trim() === "" ? null : Number(giorni),
                    nota
                  );
                  setAvviso(r.error ?? r.ok ?? null);
                })
              }
              className="min-h-11 rounded-full border border-border px-5 text-sm font-medium disabled:opacity-60"
            >
              {t("abbonamento.salva")}
            </button>
          </div>

          {avviso && (
            <p role="status" className="text-sm font-medium">
              {avviso}
            </p>
          )}

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium">{t("formato.titolo")}</p>
            <p className="mt-0.5 text-xs text-muted">{t("formato.spiegazione")}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={formato}
                onChange={(e) => setFormato(e.target.value)}
                aria-label={t("formato.aria", { nome: locale.nome })}
                className={`${CAMPO} min-w-52`}
              >
                <option value="">{t("formato.scegli")}</option>
                {MODELLI.map((m) => (
                  <option key={m.tipo} value={m.tipo}>
                    {m.nome}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={pending || !formato}
                onClick={() =>
                  start(async () => {
                    const r = await impostaFormato(
                      locale.id,
                      formato,
                      soloCategorie,
                      conListino
                    );
                    setAvviso(r.error ?? r.ok ?? null);
                  })
                }
                className="min-h-11 rounded-full border border-border px-5 text-sm font-medium disabled:opacity-60"
              >
                {t("formato.applica")}
              </button>
            </div>

            {/*
              La commissione sta qui e non nelle Impostazioni del locale: è
              una condizione commerciale, la scrive chi vende. E sta accanto
              a moduli e abbonamento perché è la stessa conversazione.
            */}
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-sm font-medium">{t("commissione.titolo")}</p>
              <p className="mt-1 text-xs text-muted">{t("commissione.nota")}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-muted">
                  {t("commissione.campo")}
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.05"
                    value={commissione}
                    onChange={(e) => setCommissione(e.target.value)}
                    className="min-h-11 w-24 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  />
                  %
                </label>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await impostaCommissione(
                        locale.id,
                        Number(commissione),
                        nota
                      );
                      setAvviso(r.error ?? r.ok ?? null);
                    })
                  }
                  className="min-h-11 rounded-full border border-border px-5 text-sm font-medium disabled:opacity-60"
                >
                  {t("commissione.salva")}
                </button>
              </div>

              {Number(commissione) > 0 && (
                <p
                  role="status"
                  className="mt-2 rounded-lg border border-amber-400 bg-amber-50 p-2 text-xs text-amber-900"
                >
                  {t("commissione.avviso")}
                </p>
              )}
            </div>

            <label className="mt-2 flex min-h-11 items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={soloCategorie}
                onChange={(e) => setSoloCategorie(e.target.checked)}
                className="h-4 w-4"
              />
              {t("formato.solo_categorie")}
            </label>

            <label className="mt-1 flex items-start gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={conListino}
                onChange={(e) => setConListino(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>{t("formato.listino")}</span>
            </label>

            {locale.formato && (
              <p className="mt-1 text-xs text-muted">
                {t("formato.attuale.prima")}{" "}
                <strong>
                  {MODELLI.find((m) => m.tipo === locale.formato)?.nome ??
                    locale.formato}
                </strong>
                {t("formato.attuale.dopo")}
              </p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium">{t("scheda.titolo")}</p>
            <p className="mt-0.5 text-xs text-muted">{t("scheda.sottotitolo")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted">
                {t("scheda.referente")}
                <input {...campo("referente_nome")} placeholder={t("scheda.referente.placeholder")} className={`${CAMPO} mt-1 block w-full`} />
              </label>
              <label className="text-xs font-medium text-muted">
                {t("scheda.telefono")}
                <input {...campo("referente_telefono")} placeholder={t("scheda.telefono.placeholder")} className={`${CAMPO} mt-1 block w-full`} />
              </label>
              <label className="text-xs font-medium text-muted">
                {t("scheda.email")}
                <input {...campo("referente_email")} type="email" className={`${CAMPO} mt-1 block w-full`} />
              </label>
              <label className="text-xs font-medium text-muted">
                {t("scheda.provenienza")}
                <input {...campo("provenienza")} placeholder={t("scheda.provenienza.placeholder")} className={`${CAMPO} mt-1 block w-full`} />
              </label>
              <label className="text-xs font-medium text-muted">
                {t("scheda.ricontattare")}
                <input {...campo("ricontattare_il")} type="date" className={`${CAMPO} mt-1 block w-full`} />
              </label>
              <label className="text-xs font-medium text-muted">
                {t("scheda.abbandono")}
                <input {...campo("motivo_abbandono")} placeholder={t("scheda.abbandono.placeholder")} className={`${CAMPO} mt-1 block w-full`} />
              </label>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await salvaScheda(locale.id, scheda);
                  setAvviso(r.error ?? r.ok ?? null);
                })
              }
              className="mt-2 min-h-11 rounded-full border border-border px-5 text-sm font-medium disabled:opacity-60"
            >
              {t("scheda.salva")}
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium">{t("note.titolo")}</p>
            <p className="mt-0.5 text-xs text-muted">{t("note.sottotitolo")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={nuovaNota}
                onChange={(e) => setNuovaNota(e.target.value)}
                placeholder={t("note.placeholder")}
                maxLength={2000}
                aria-label={t("note.aria")}
                className={`${CAMPO} min-w-48 flex-1`}
              />
              <button
                type="button"
                disabled={pending || !nuovaNota.trim()}
                onClick={() =>
                  start(async () => {
                    const r = await aggiungiNota(locale.id, nuovaNota);
                    setAvviso(r.error ?? r.ok ?? null);
                    if (!r.error) setNuovaNota("");
                  })
                }
                className="min-h-11 rounded-full border border-border px-4 text-sm disabled:opacity-60"
              >
                {tc("azione.aggiungi")}
              </button>
            </div>
            {locale.note.length > 0 && (
              <ul className="mt-2 space-y-1.5 text-sm">
                {locale.note.map((n, i) => (
                  <li key={i} className="border-l-2 border-border pl-3">
                    <span className="text-xs text-muted">
                      {t.data(new Date(n.quando), "corta")} · {n.chi}
                    </span>
                    <span className="block whitespace-pre-line">{n.testo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium">{t("titolare.titolo")}</p>
            <p className="mt-0.5 text-xs text-muted">{t("titolare.sottotitolo")}</p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-xs font-medium text-muted">
                {t("titolare.nome")}
                <input
                  value={nomeTitolare}
                  onChange={(e) => setNomeTitolare(e.target.value)}
                  placeholder={t("titolare.nome.placeholder")}
                  className={`${CAMPO} mt-1 block w-40`}
                />
              </label>
              <label className="min-w-48 flex-1 text-xs font-medium text-muted">
                {t("titolare.email")}
                <input
                  type="email"
                  value={mailTitolare}
                  onChange={(e) => setMailTitolare(e.target.value)}
                  placeholder={t("titolare.email.placeholder")}
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
                {t("titolare.crea")}
              </button>
            </div>

            {passwordUnaVolta && (
              <p className="mt-2 rounded-lg border border-accent bg-accent/10 p-3 text-sm">
                {t("titolare.password.a")}{" "}
                <strong>{t("titolare.password.forte")}</strong>{" "}
                {t("titolare.password.b")}{" "}
                <code className="rounded bg-background px-2 py-0.5 text-base font-semibold tracking-wider">
                  {passwordUnaVolta}
                </code>
                <span className="mt-1 block text-xs text-muted">
                  {t("titolare.password.nota")}
                </span>
              </p>
            )}
          </div>

          {locale.interventi.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t("interventi.titolo")}
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-muted">
                {locale.interventi.map((e, i) => (
                  <li key={i}>
                    {t.dataOra(new Date(e.quando))} · {e.chi} · {e.azione}
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
