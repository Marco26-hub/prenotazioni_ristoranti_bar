"use client";

import { useState, useTransition } from "react";
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

const STATO: Record<string, { etichetta: string; classe: string }> = {
  pending: { etichetta: "Da confermare", classe: "border-amber-400 text-amber-700" },
  confirmed: { etichetta: "Confermata", classe: "border-success text-success" },
  seated: { etichetta: "Arrivato", classe: "border-success text-success" },
  declined: { etichetta: "Rifiutata", classe: "border-border text-muted" },
  cancelled: { etichetta: "Annullata", classe: "border-border text-muted" },
  no_show: { etichetta: "Non presentato", classe: "border-danger text-danger" },
};

const MOTIVI = [
  "Siamo al completo per quell'orario.",
  "Chiusura straordinaria in quella data.",
  "Non possiamo accogliere un gruppo di queste dimensioni.",
];

function ora(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function CardPrenotazione({ p }: { p: Prenotazione }) {
  const [pending, start] = useTransition();
  const [avviso, setAvviso] = useState<string | null>(null);
  const [rifiutando, setRifiutando] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVI[0]);

  const stato = STATO[p.stato] ?? { etichetta: p.stato, classe: "border-border text-muted" };
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
          <span className="tabular-nums">{ora(p.quando)}</span> · {p.nome}
        </p>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${stato.classe}`}>
          {stato.etichetta}
        </span>
      </div>

      <p className="mt-1 text-sm text-muted">
        {p.coperti} {p.coperti === 1 ? "persona" : "persone"}
        {p.tavoli.length > 0 && (
          <>
            {" · "}
            {p.tavoli.length === 1 ? "Tavolo" : "Tavoli"} {p.tavoli.join(" + ")}
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
        <p className="mt-1 text-sm text-muted">Motivo: {p.motivoRifiuto}</p>
      )}

      {/* Un avviso non partito va visto: il cliente si presenterebbe convinto
          di avere il tavolo, o non si presenterebbe affatto. */}
      {p.erroreAvviso && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          Email al cliente non inviata ({p.erroreAvviso}). Avvisalo tu.
        </p>
      )}
      {p.erroreAvvisoLocale && p.stato === "pending" && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          Questa richiesta non ti è arrivata per email ({p.erroreAvvisoLocale}).
        </p>
      )}

      {rifiutando ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <label className="block text-xs text-muted" htmlFor={`motivo-${p.id}`}>
            Cosa scriviamo al cliente
          </label>
          <select
            id={`motivo-${p.id}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            {MOTIVI.map((m) => (
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
          <p className="text-xs text-muted">
            Insieme al motivo mandiamo gli orari vicini in cui c&apos;è posto
            davvero, calcolati sulle prenotazioni già prese.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => esegui(() => rifiutaPrenotazione(p.id, motivo))}
              className="min-h-11 flex-1 rounded-full bg-danger px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? "Invio…" : "Rifiuta e avvisa"}
            </button>
            <button
              type="button"
              onClick={() => setRifiutando(false)}
              className="flex min-h-11 items-center px-3 text-sm underline"
            >
              Annulla
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
                {pending ? "…" : "Conferma"}
              </button>
              <button
                type="button"
                onClick={() => setRifiutando(true)}
                className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm"
              >
                Rifiuta
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
                È arrivato
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => esegui(() => setReservationStatus(p.id, "no_show"))}
                className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm"
              >
                Non presentato
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => esegui(() => cancelReservation(p.id))}
                className="flex min-h-11 items-center px-3 text-sm text-danger underline"
              >
                Annulla
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
