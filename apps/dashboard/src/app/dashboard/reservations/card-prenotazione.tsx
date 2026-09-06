"use client";

import { useState, useTransition } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tComune } from "@repo/shared/i18n/comune";
import { tPrenotazioni } from "@/i18n/prenotazioni";
import {
  confermaPrenotazione,
  rifiutaPrenotazione,
  cancelReservation,
  setReservationStatus,
} from "./actions";

export interface Prenotazione {
  id: string;
  nome: string;
  telefono: string | null;
  email: string | null;
  coperti: number;
  quando: string;
  note: string | null;
  stato: string;
  motivoRifiuto: string | null;
  avvisatoIl: string | null;
  erroreAvviso: string | null;
  erroreAvvisoLocale: string | null;
  tavoli: string[];
}

/**
 * Colore ed etichetta per ogni stato.
 *
 * A sinistra il valore del database, che non si tocca; a destra la chiave
 * del dizionario, perché l'etichetta cambia con la lingua.
 */
const STATO: Record<string, { chiave: ChiaveStato; classe: string }> = {
  pending: { chiave: "stato.pending", classe: "border-amber-400 text-amber-700" },
  confirmed: { chiave: "stato.confirmed", classe: "border-success text-success" },
  seated: { chiave: "stato.seated", classe: "border-success text-success" },
  declined: { chiave: "stato.declined", classe: "border-border text-muted" },
  cancelled: { chiave: "stato.cancelled", classe: "border-border text-muted" },
  no_show: { chiave: "stato.no_show", classe: "border-danger text-danger" },
};

type ChiaveStato =
  | "stato.pending"
  | "stato.confirmed"
  | "stato.seated"
  | "stato.declined"
  | "stato.cancelled"
  | "stato.no_show";

/** I motivi pronti, nell'ordine in cui compaiono nel menu a tendina. */
const MOTIVI = ["motivo.completo", "motivo.chiusura", "motivo.gruppo"] as const;

export function CardPrenotazione({ p }: { p: Prenotazione }) {
  const lingua = useLingua();
  const t = tPrenotazioni(lingua);
  const c = tComune(lingua);

  const motiviPronti = MOTIVI.map((k) => t(k));

  const [pending, start] = useTransition();
  const [avviso, setAvviso] = useState<string | null>(null);
  const [rifiutando, setRifiutando] = useState(false);
  const [motivo, setMotivo] = useState(motiviPronti[0]);

  const stato = STATO[p.stato];
  const classe = stato?.classe ?? "border-border text-muted";
  const etichettaStato = stato ? t(stato.chiave) : p.stato;
  const chiusa = p.stato === "cancelled" || p.stato === "declined";

  function esegui(fn: () => Promise<{ avviso?: string; error?: string } | void>) {
    setAvviso(null);
    start(async () => {
      const r = await fn();
      if (r && "error" in r && r.error) setAvviso(r.error);
      else if (r && "avviso" in r && r.avviso) setAvviso(r.avviso);
      setRifiutando(false);
    });
  }

  return (
    <li
      className={`rounded-xl border bg-surface p-4 ${
        p.stato === "pending" ? "border-amber-400" : "border-border"
      } ${chiusa ? "opacity-70" : ""}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className={`font-medium ${chiusa ? "line-through" : ""}`}>
          <span className="tabular-nums">{t.ora(new Date(p.quando))}</span> · {p.nome}
        </p>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${classe}`}>
          {etichettaStato}
        </span>
      </div>

      <p className="mt-1 text-sm text-muted">
        {t.n(p.coperti, "card.persone")}
        {p.tavoli.length > 0 && (
          <>
            {" · "}
            {t.n(p.tavoli.length, "card.tavolo")} {p.tavoli.join(" + ")}
          </>
        )}
        {p.telefono && (
          <>
            {" · "}
            <a href={`tel:${p.telefono}`} className="underline underline-offset-2">
              {p.telefono}
            </a>
          </>
        )}
        {p.email && (
          <>
            {" · "}
            <a href={`mailto:${p.email}`} className="underline underline-offset-2">
              {p.email}
            </a>
          </>
        )}
      </p>

      {p.note && <p className="mt-1 text-sm italic text-muted">{p.note}</p>}

      {p.motivoRifiuto && (
        <p className="mt-1 text-sm text-muted">
          {t("card.motivo", { motivo: p.motivoRifiuto })}
        </p>
      )}

      {/* Un avviso non partito va visto: il cliente si presenterebbe convinto
          di avere il tavolo, o non si presenterebbe affatto. */}
      {p.erroreAvviso && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          {t("card.email_non_inviata", { errore: p.erroreAvviso })}
        </p>
      )}
      {p.erroreAvvisoLocale && p.stato === "pending" && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          {t("card.richiesta_non_arrivata", { errore: p.erroreAvvisoLocale })}
        </p>
      )}

      {rifiutando ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <label className="block text-xs text-muted" htmlFor={`motivo-${p.id}`}>
            {t("card.rifiuto.etichetta")}
          </label>
          <select
            id={`motivo-${p.id}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            {motiviPronti.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted">{t("card.rifiuto.nota")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => esegui(() => rifiutaPrenotazione(p.id, motivo))}
              className="min-h-11 flex-1 rounded-full bg-danger px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? t("card.rifiuto.invio") : t("card.rifiuto.conferma")}
            </button>
            <button
              type="button"
              onClick={() => setRifiutando(false)}
              className="flex min-h-11 items-center px-3 text-sm underline"
            >
              {c("azione.annulla")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          {p.stato === "pending" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => esegui(() => confermaPrenotazione(p.id))}
                className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-60"
              >
                {pending ? "…" : t("card.conferma")}
              </button>
              <button
                type="button"
                onClick={() => setRifiutando(true)}
                className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm"
              >
                {t("card.rifiuta")}
              </button>
            </>
          )}

          {p.stato === "confirmed" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => esegui(() => setReservationStatus(p.id, "seated"))}
                className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm"
              >
                {t("card.arrivato")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => esegui(() => setReservationStatus(p.id, "no_show"))}
                className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm"
              >
                {t("card.non_presentato")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => esegui(() => cancelReservation(p.id))}
                className="flex min-h-11 items-center px-3 text-sm text-danger underline"
              >
                {t("card.annulla_prenotazione")}
              </button>
            </>
          )}
        </div>
      )}

      {avviso && (
        <p role="status" className="mt-2 text-sm font-medium">
          {avviso}
        </p>
      )}
    </li>
  );
}
