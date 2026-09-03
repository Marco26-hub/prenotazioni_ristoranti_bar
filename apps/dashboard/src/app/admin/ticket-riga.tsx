"use client";

import { useState, useTransition } from "react";
import { rispondiTicket } from "./actions";

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
                blocca il servizio
              </span>
            )}
            {ticket.locale} — {ticket.oggetto}
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {ticket.chi} ·{" "}
            {ore < 24 ? `${ore} ore fa` : `${Math.floor(ore / 24)} giorni fa`}
            {ticket.stato === "in_corso" && " · presa in carico"}
          </span>
        </span>
        <span className="shrink-0 text-sm text-muted">{aperto ? "chiudi" : "apri"}</span>
      </button>

      {aperto && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <p className="whitespace-pre-line text-sm">{ticket.messaggio}</p>

          <textarea
            value={risposta}
            onChange={(e) => setRisposta(e.target.value)}
            rows={3}
            placeholder="Risposta al locale"
            maxLength={4000}
            aria-label="Risposta"
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
              Rispondi, resta aperta
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
              Rispondi e chiudi
            </button>
          </div>

          {avviso && <p role="status" className="text-sm font-medium">{avviso}</p>}
        </div>
      )}
    </li>
  );
}
