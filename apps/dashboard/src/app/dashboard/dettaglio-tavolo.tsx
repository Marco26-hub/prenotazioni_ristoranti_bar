"use client";

import { useEffect } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tSala, type TSala } from "@/i18n/sala";
import type { TavoloSala } from "./sala";

const STATO_ETICHETTA: Record<string, string> = {
  pending: "riga.stato.pending",
  sent_to_kitchen: "riga.stato.sent_to_kitchen",
  preparing: "riga.stato.preparing",
  ready: "riga.stato.ready",
  served: "riga.stato.served",
};

/** Piatti raggruppati per dove si trovano: è la domanda vera del titolare. */
const FASI: Array<{ chiave: string; titolo: string; stati: string[] }> = [
  {
    chiave: "cucina",
    titolo: "dettaglio.fase.cucina",
    stati: ["pending", "sent_to_kitchen", "preparing"],
  },
  { chiave: "passe", titolo: "dettaglio.fase.passe", stati: ["ready"] },
  { chiave: "tavolo", titolo: "dettaglio.fase.tavolo", stati: ["served"] },
];

function durata(daISO: string, adesso: number, t: TSala): string {
  const minuti = Math.max(0, Math.floor((adesso - new Date(daISO).getTime()) / 60000));
  if (minuti < 60) return t("durata.minuti", { n: minuti });
  return t("durata.ore", {
    ore: Math.floor(minuti / 60),
    minuti: String(minuti % 60).padStart(2, "0"),
  });
}

/**
 * Dettaglio di un tavolo occupato.
 *
 * La scheda in griglia deve restare leggibile a colpo d'occhio da lontano,
 * quindi non può contenere tutto. Qui invece sta la situazione completa:
 * cosa è in cucina, cosa è pronto e fermo al passe — il caso che fa perdere
 * i clienti — e cosa è già in tavola.
 */
export function DettaglioTavolo({
  tavolo,
  adesso,
  onClose,
  onChiudiConto,
}: {
  tavolo: TavoloSala;
  adesso: number;
  onClose: () => void;
  onChiudiConto: () => void;
}) {
  /* La lingua arriva dal contesto e non come prop: la scheda si apre da un
     punto solo, ma è annidata dentro la sala e una prop in più su questo
     percorso è una prop che prima o poi non viene passata. */
  const t = tSala(useLingua());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const daPagare = tavolo.ordinatoCents - tavolo.pagatoCents;

  // Quante quote uguali restano da incassare. Solo se il residuo è un
  // multiplo pulito della quota: se hanno pagato per piatto il numero non
  // significherebbe niente e sarebbe peggio mostrarlo.
  const quota =
    tavolo.coperti > 0 ? Math.round(tavolo./* comprende formula, coperto e servizio */ ordinatoCents / tavolo.coperti) : 0;
  const quoteResidue =
    quota > 0 && daPagare > 0 && Math.abs(daPagare % quota) <= tavolo.coperti
      ? Math.round(daPagare / quota)
      : null;
  const totaliPiatti = tavolo.righe.reduce((s, r) => s + r.quantita, 0);
  const mancanti = tavolo.coperti - tavolo.nPagamenti;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("dettaglio.aria", { codice: tavolo.codice })}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-0"
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-5 py-3 backdrop-blur">
          <div>
            <p className="flex items-center gap-2">
              <span className="text-sm uppercase tracking-wide text-muted">
                {t("dettaglio.tavolo")}
              </span>
              <span className="rounded-lg bg-lime-300 px-3 py-0.5 text-3xl font-black leading-tight tracking-tight text-zinc-900">
                {tavolo.codice}
              </span>
            </p>
            {tavolo.apertoDa && (
              <p className="text-xs text-muted">
                {t("dettaglio.aperto", {
                  durata: durata(tavolo.apertoDa, adesso, t),
                  coperti: t.n(tavolo.coperti, "sala.riepilogo.coperti"),
                  piatti: t.n(totaliPiatti, "dettaglio.piatti"),
                })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("dettaglio.chiudi")}
            className="h-11 w-11 shrink-0 rounded-full border border-border text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {FASI.map((fase) => {
            const righe = tavolo.righe.filter((r) => fase.stati.includes(r.stato));
            if (righe.length === 0) return null;

            const pezzi = righe.reduce((s, r) => s + r.quantita, 0);

            return (
              <section key={fase.chiave}>
                <h3 className="mb-2 flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-muted">
                  <span
                    className={fase.chiave === "passe" ? "text-accent" : undefined}
                  >
                    {t(fase.titolo as Parameters<typeof t>[0])}
                  </span>
                  <span className="tabular-nums">{pezzi}</span>
                </h3>
                <ul className="space-y-1.5">
                  {righe.map((r, i) => (
                    <li
                      key={`${fase.chiave}-${i}`}
                      className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                    >
                      <span className="min-w-0 text-pretty">
                        <span className="tabular-nums font-medium">{r.quantita}×</span>{" "}
                        {r.nome}
                        {r.note && (
                          <span className="block text-xs italic text-muted">{r.note}</span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-baseline gap-2 self-end sm:self-auto">
                        <span
                          className={`text-xs ${r.trattenuto ? "font-medium text-amber-600" : "text-muted"}`}
                        >
                          {r.trattenuto
                            ? t("riga.trattenuto")
                            : STATO_ETICHETTA[r.stato]
                              ? t(STATO_ETICHETTA[r.stato] as Parameters<typeof t>[0])
                              : r.stato}
                        </span>
                        <span className="w-16 text-right tabular-nums">
                          {t.prezzo(r.prezzoCents)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {tavolo.righe.length === 0 && (
            <p className="text-sm text-muted">{t("dettaglio.vuoto")}</p>
          )}

          <section className="space-y-1 border-t border-border pt-3 text-sm tabular-nums">
            <p className="flex justify-between">
              <span className="text-muted">{t("dettaglio.ordinato")}</span>
              <span>{t.prezzo(tavolo.ordinatoCents)}</span>
            </p>
            {tavolo.pagatoCents > 0 && (
              <p className="flex justify-between text-success">
                <span>{t("dettaglio.gia_pagato")}</span>
                <span>{t.prezzo(tavolo.pagatoCents)}</span>
              </p>
            )}
            <p className="flex justify-between text-base font-semibold">
              <span>{t("tavolo.da_incassare")}</span>
              <span>{t.prezzo(Math.max(0, daPagare))}</span>
            </p>
            {tavolo.coperti > 0 && tavolo.ordinatoCents > 0 && (
              <p className="flex justify-between text-xs text-muted">
                <span>{t("dettaglio.per_persona")}</span>
                <span>{t.prezzo(quota)}</span>
              </p>
            )}

            {/* Chi manca all'appello. Il numero di pagamenti è un fatto; le
                quote residue sono una divisione, e vanno dette come tali —
                uno può aver pagato per due. */}
            {daPagare > 0 && tavolo.nPagamenti > 0 && (
              <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
                <strong>
                  {t.n(tavolo.nPagamenti, "dettaglio.pagato", {
                    coperti: tavolo.coperti,
                  })}
                </strong>
                {mancanti > 0 && (
                  <strong>{t.n(mancanti, "dettaglio.mancano")}</strong>
                )}
                {quoteResidue !== null && (
                  <span className="mt-0.5 block text-xs">
                    {t.n(quoteResidue, "dettaglio.quote", {
                      residuo: t.prezzo(daPagare),
                      quota: t.prezzo(quota),
                    })}
                  </span>
                )}
              </p>
            )}

            {daPagare > 0 && tavolo.nPagamenti === 0 && tavolo.coperti > 0 && (
              <p className="mt-2 text-xs text-muted">
                {t.n(tavolo.coperti, "dettaglio.nessuno")}
              </p>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard/orders"
              className="flex min-h-11 flex-1 items-center justify-center rounded-full border border-border px-4 text-sm"
            >
              {t("dettaglio.comande")}
            </a>
            <button
              type="button"
              onClick={onChiudiConto}
              className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground"
            >
              {daPagare > 0 ? t("tavolo.incassa_chiudi") : t("tavolo.chiudi_conto")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
