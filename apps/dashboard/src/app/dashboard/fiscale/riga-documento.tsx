"use client";

import { useState, useTransition } from "react";
import { segnaBattuto, rimettiInCoda } from "./actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tComune } from "@repo/shared/i18n/comune";
import { tSoldi } from "@/i18n/soldi";
import { RT_SENZA_NUMERO, RT_SENZA_NUMERO_LEGACY } from "@/lib/rt-errori";
import { RT_DA_VERIFICARE } from "./rt-incerto";

const COLORE: Record<string, string> = {
  da_emettere: "border-amber-300 bg-amber-50 text-amber-900",
  in_corso: "border-border",
  emesso: "border-success text-success",
  errore: "border-danger bg-danger/5 text-danger",
  battuto_a_mano: "border-border text-muted",
};

/**
 * Un documento in elenco, con il modo di chiuderlo a mano.
 *
 * Serve a chi lavora in manuale e a chi ha avuto un guasto: un documento che
 * resta "da emettere" per sempre sporca il riepilogo dei corrispettivi, e la
 * persona che l'ha battuto sa di averlo battuto.
 */
export function RigaDocumento({
  id,
  totale,
  stato,
  numero,
  errore,
  quando,
  pagamenti,
  aliquote,
  riprovabile,
}: {
  id: string;
  totale: string;
  stato: string;
  numero: string | null;
  errore: string | null;
  quando: string;
  pagamenti: string;
  /** Diviso per aliquota: è così che si batte su un registratore. */
  aliquote: string;
  /** Falso per le giornate già chiuse: rimetterlo in coda non lo farebbe uscire. */
  riprovabile: boolean;
}) {
  const lingua = useLingua();
  const t = tSoldi(lingua);
  const tc = tComune(lingua);
  const [aperto, setAperto] = useState(false);
  const [num, setNum] = useState("");
  const [avviso, setAvviso] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Le etichette dello stato: i valori a database restano da_emettere/…
  const ETICHETTA: Record<string, string> = {
    da_emettere: t("documento.stato.da_emettere"),
    in_corso: t("documento.stato.in_corso"),
    emesso: t("documento.stato.emesso"),
    errore: t("documento.stato.errore"),
    battuto_a_mano: t("documento.stato.battuto_a_mano"),
  };

  /*
   * Anche 'in_corso' si chiude a mano.
   *
   * Il computer della cassa spento subito dopo che la coda gli ha consegnato
   * venti documenti li lascia lì: contano fra quelli da certificare e, se
   * l'agente non riparte più — registratore guasto, passaggio a manuale —
   * non c'è nessun modo di toglierli dall'elenco. L'azione dietro li accetta
   * già; mancava solo il bottone, con l'avviso che la cassa potrebbe averlo
   * stampato davvero.
   */
  const daChiudere =
    stato === "da_emettere" || stato === "errore" || stato === "in_corso";
  const daRimettere = riprovabile && (stato === "errore" || stato === "in_corso");
  const daVerificare = Boolean(errore?.startsWith(RT_DA_VERIFICARE));

  return (
    <li className="rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium tabular-nums">{totale}</p>
          <p className="text-xs text-muted">
            {quando}
            {pagamenti && ` · ${pagamenti}`}
            {numero && ` · ${t("documento.numero_breve", { numero })}`}
          </p>
          {/* Per aliquota: è il numero che serve a chi batte a mano. */}
          {aliquote && <p className="text-xs text-muted">{aliquote}</p>}
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs ${COLORE[stato] ?? "border-border"}`}
        >
          {ETICHETTA[stato] ?? stato}
        </span>
      </div>

      {errore && (
        <p className="mt-1 text-xs text-danger">
          {errore === RT_SENZA_NUMERO || errore === RT_SENZA_NUMERO_LEGACY
            ? t("documento.errore.senza_numero")
            : daVerificare
              ? t("documento.da_verificare")
              : errore}
        </p>
      )}

      {!aperto && (daChiudere || daRimettere) && (
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {daChiudere && (
            <button
              type="button"
              onClick={() => setAperto(true)}
              className="min-h-10 text-sm underline underline-offset-4"
            >
              {t("documento.battuto")}
            </button>
          )}
          {daRimettere && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await rimettiInCoda(id);
                  setAvviso(r.error ?? r.ok ?? null);
                })
              }
              className="min-h-10 text-sm underline underline-offset-4 disabled:opacity-60"
            >
              {t("documento.rimetti")}
            </button>
          )}
        </div>
      )}

      {daChiudere && aperto && stato === "in_corso" && (
        <p className="mt-2 text-xs text-danger">
          {t("documento.battuto.avviso.in_corso")}
        </p>
      )}

      {daChiudere && aperto && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={num}
            onChange={(e) => setNum(e.target.value)}
            placeholder={t("documento.numero.segnaposto")}
            aria-label={t("documento.numero.aria")}
            className="min-h-11 min-w-48 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await segnaBattuto(id, num);
                setAvviso(r.error ?? r.ok ?? null);
                if (!r.error) setAperto(false);
              })
            }
            className="min-h-11 rounded-full border border-border px-4 text-sm disabled:opacity-60"
          >
            {tc("azione.conferma")}
          </button>
        </div>
      )}

      {avviso && <p className="mt-1 text-sm">{avviso}</p>}
    </li>
  );
}
