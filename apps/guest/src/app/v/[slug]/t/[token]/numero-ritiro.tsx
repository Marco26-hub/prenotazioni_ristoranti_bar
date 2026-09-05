"use client";

import { useCallback, useState } from "react";
import { useRitmo } from "@repo/shared/ritmo";

interface Ordine {
  numero: number;
  stato: "in_preparazione" | "pronto" | "ritirato";
}

/**
 * Il numero di ritiro sul telefono di chi aspetta.
 *
 * Al banco senza tavoli il cliente non ha un posto a cui portargli il piatto:
 * ha un numero. Averlo qui, che si aggiorna da solo, evita di stare in piedi
 * davanti al bancone a guardare se è il proprio — che è esattamente la coda
 * che il QR doveva togliere.
 *
 * Compare solo se il locale ha scelto il metodo "telefono": chi consegna un
 * segnaposto o un cercapersone non vuole un secondo canale che dica cose
 * leggermente diverse.
 */
export function NumeroRitiro({ sessionId }: { sessionId: string }) {
  const [ordini, setOrdini] = useState<Ordine[]>([]);

  const carica = useCallback(async () => {
    try {
      const r = await fetch(`/api/ritiro?sessionId=${sessionId}`);
      if (!r.ok) return;
      const d = await r.json();
      setOrdini(d.ordini ?? []);
    } catch {
      // Un tentativo mancato non va raccontato: fra tre secondi si riprova,
      // e un avviso di rete su un numero che si aggiorna da solo sarebbe
      // rumore mentre si aspetta un panino.
    }
  }, [sessionId]);

  /*
   * Si aggiorna mentre il cliente guarda.
   *
   * Chi aspetta il proprio numero tiene la pagina davanti, e allora conta
   * ogni secondo; ma appena mette via il telefono non serve più chiedere —
   * ed è lì che stavano quasi tutte le richieste. Rallenta anche quando il
   * numero non si muove: fra "in preparazione" e "pronto" passano minuti,
   * non secondi.
   */
  const daRitirare = ordini.filter((o) => o.stato !== "ritirato");

  useRitmo(carica, {
    svelto: 5000,
    lento: 15000,
    // Niente da ritirare: non c'è niente da guardare.
    attivo: ordini.length === 0 || daRitirare.length > 0,
  });
  if (daRitirare.length === 0) return null;

  return (
    <section
      aria-label="Il tuo numero"
      className="mt-5 space-y-2"
    >
      {daRitirare.map((o) => {
        const pronto = o.stato === "pronto";
        return (
          <div
            key={o.numero}
            className={`flex items-center gap-4 rounded-xl border p-4 ${
              pronto
                ? "border-success bg-success/10"
                : "border-border bg-surface"
            }`}
          >
            {/* Grande e leggibile in piedi, con il telefono a mezz'aria. */}
            <span
              aria-hidden
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-3xl font-bold tabular-nums ${
                pronto
                  ? "bg-success text-white"
                  : "bg-background text-foreground"
              }`}
            >
              {o.numero}
            </span>
            <div className="min-w-0">
              <p className="font-semibold" role={pronto ? "status" : undefined}>
                {pronto ? "Pronto, vieni a ritirare" : "In preparazione"}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {pronto
                  ? `Al banco chiedi il numero ${o.numero}.`
                  : `Il tuo numero è ${o.numero}. Ti avvisiamo qui quando è pronto.`}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
