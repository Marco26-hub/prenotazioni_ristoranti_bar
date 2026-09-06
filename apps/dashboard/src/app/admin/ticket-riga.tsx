"use client";

import { useState, useTransition } from "react";
import { rispondiTicket } from "./actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tSuperAdmin } from "@/i18n/superadmin";

export interface Ticket {
  id: string;
  locale: string;
  oggetto: string;
  messaggio: string;
  urgente: boolean;
  stato: string;
  risposta: string | null;
  chi: string;
  /** Ore trascorse, calcolate dal database. */
  oreFa: number;
}

export function TicketRiga({ ticket }: { ticket: Ticket }) {
  const t = tSuperAdmin(useLingua());
  const [aperto, setAperto] = useState(false);
  const [risposta, setRisposta] = useState(ticket.risposta ?? "");
  const [avviso, setAvviso] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ore = ticket.oreFa;

  return (
    <li
      className={`rounded-xl border bg-surface p-3 ${
        ticket.urgente ? "border-danger" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block font-medium">
            {ticket.urgente && (
              <span className="mr-2 rounded-full bg-danger px-2 py-0.5 text-xs text-white">
                {t("ticket.urgente")}
              </span>
            )}
            {ticket.locale} — {ticket.oggetto}
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {ticket.chi} ·{" "}
            {ore < 24
              ? t.n(ore, "ticket.ore_fa")
              : t.n(Math.floor(ore / 24), "ticket.giorni_fa")}
            {ticket.stato === "in_corso" && t("ticket.in_corso")}
          </span>
        </span>
        <span className="shrink-0 text-sm text-muted">
          {aperto ? t("ticket.chiudi") : t("ticket.apri")}
        </span>
      </button>

      {aperto && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <p className="whitespace-pre-line text-sm">{ticket.messaggio}</p>

          <textarea
            value={risposta}
            onChange={(e) => setRisposta(e.target.value)}
            rows={3}
            placeholder={t("ticket.risposta.placeholder")}
            maxLength={4000}
            aria-label={t("ticket.risposta.aria")}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await rispondiTicket(ticket.id, risposta, "in_corso");
                  setAvviso(r.error ?? r.ok ?? null);
                })
              }
              className="min-h-11 rounded-full border border-border px-4 text-sm disabled:opacity-60"
            >
              {t("ticket.rispondi")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await rispondiTicket(ticket.id, risposta, "risolto");
                  setAvviso(r.error ?? r.ok ?? null);
                })
              }
              className="min-h-11 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-60"
            >
              {t("ticket.rispondi_chiudi")}
            </button>
          </div>

          {avviso && <p role="status" className="text-sm font-medium">{avviso}</p>}
        </div>
      )}
    </li>
  );
}
