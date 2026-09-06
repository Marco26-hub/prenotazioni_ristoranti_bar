"use client";

import { useState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tSala } from "@/i18n/sala";
import { pdfLocandine, scarica, ABBONDANZA_MM, type DatiLocandina } from "./locandina";

/**
 * Un solo PDF con tutti i tavoli, una pagina ciascuno.
 *
 * Scaricare undici file uno per uno e portarli in copisteria è il modo in
 * cui si perde il tavolo 7. Qui esce un file solo, nell'ordine dei tavoli.
 */
export function PdfTutti({
  tavoli,
  nomeLocale,
}: {
  tavoli: DatiLocandina[];
  nomeLocale: string;
}) {
  const t = tSala(useLingua());
  const [stato, setStato] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  if (tavoli.length === 0) return null;

  return (
    <div className="rounded-xl border border-accent bg-surface p-4">
      <h2 className="font-semibold">{t("locandina.tutti.titolo")}</h2>
      <p className="mt-0.5 mb-3 text-sm text-muted">
        {t("locandina.tutti.spiegazione", {
          tavoli: tavoli.length,
          mm: ABBONDANZA_MM,
        })}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={inCorso}
          onClick={async () => {
            setInCorso(true);
            setStato(null);
            try {
              const blob = await pdfLocandine(tavoli, t, (fatti, totale) =>
                setStato(t("locandina.tutti.progresso", { fatti, totale }))
              );
              const nome = nomeLocale
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
              scarica(
                blob,
                `${t("locandina.file.tutti")}-${nome || t("locandina.file.locale")}.pdf`
              );
              setStato(t.n(tavoli.length, "locandina.tutti.pronto"));
            } catch (e) {
              setStato(
                e instanceof Error ? e.message : t("locandina.errore.pdf")
              );
            } finally {
              setInCorso(false);
            }
          }}
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {inCorso
            ? t("locandina.tutti.in_corso")
            : t("locandina.tutti.crea", { n: tavoli.length })}
        </button>
        {stato && <p className="text-sm">{stato}</p>}
      </div>
    </div>
  );
}
