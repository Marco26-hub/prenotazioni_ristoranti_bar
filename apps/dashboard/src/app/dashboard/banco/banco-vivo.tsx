"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chiamaNumero } from "./actions";

export interface OrdineBanco {
  id: string;
  numero: number;
  stato: "in_preparazione" | "pronto" | "chiamato" | "ritirato";
  da: string;
}

const ISTRUZIONE: Record<string, string> = {
  segnaposto: "Consegna il piatto a chi ha il segnaposto con questo numero.",
  cercapersone: "Fai vibrare il cercapersone con questo numero.",
  telefono: "Sul telefono di chi ha ordinato compare «pronto» da solo.",
};

/**
 * Lo schermo del banco.
 *
 * Sta dietro il bancone e si guarda da lontano, in mezzo al rumore: i numeri
 * sono enormi e i colori tre soltanto, perché chi aspetta deve capire dalla
 * porta se tocca a lui.
 *
 * Si ricarica da sé: chi lavora al banco ha le mani occupate e non preme
 * "aggiorna".
 */
export function BancoVivo({
  ordini,
  metodi,
}: {
  ordini: OrdineBanco[];
  metodi: string[];
}) {
  const router = useRouter();
  const [avviso, setAvviso] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);

  const pronti = ordini.filter((o) => o.stato === "pronto" || o.stato === "chiamato");
  const inCorso = ordini.filter((o) => o.stato === "in_preparazione");

  const agisci = (id: string, azione: "chiama" | "ritira" | "annulla") =>
    start(async () => {
      const r = await chiamaNumero(id, azione);
      setAvviso(r.error ?? r.ok ?? null);
    });

  return (
    <main className="mx-auto max-w-5xl px-4 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Banco</h1>
        <p className="text-sm text-muted">
          {pronti.length} pront{pronti.length === 1 ? "o" : "i"} ·{" "}
          {inCorso.length} in preparazione
        </p>
      </div>

      {metodi.length > 0 && (
        <p className="mt-1 text-xs text-muted">
          {metodi.map((m) => ISTRUZIONE[m]).filter(Boolean).join(" ")}
        </p>
      )}

      {avviso && (
        <p role="status" className="mt-3 rounded-lg border border-border p-3 text-sm">
          {avviso}
        </p>
      )}

      <section className="mt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Pronti
        </h2>
        {pronti.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nessun ordine pronto. Compaiono qui appena la cucina li segna.
          </p>
        ) : (
          <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pronti.map((o) => (
              <li
                key={o.id}
                className={`rounded-xl border-2 p-4 ${
                  o.stato === "chiamato"
                    ? "border-accent bg-accent/10"
                    : "border-success bg-success/10"
                }`}
              >
                <p className="text-center text-6xl font-bold tabular-nums">
                  {o.numero}
                </p>
                <p className="mt-1 text-center text-sm font-medium">
                  {o.stato === "chiamato" ? "Chiamato" : "Da chiamare"}
                </p>
                <div className="mt-3 flex gap-2">
                  {o.stato === "pronto" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => agisci(o.id, "chiama")}
                      className="min-h-11 flex-1 rounded-full bg-accent text-sm font-medium text-accent-foreground disabled:opacity-60"
                    >
                      Chiama
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => agisci(o.id, "annulla")}
                      className="min-h-11 flex-1 rounded-full border border-border text-sm disabled:opacity-60"
                    >
                      Non era pronto
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => agisci(o.id, "ritira")}
                    className="min-h-11 flex-1 rounded-full border border-border text-sm disabled:opacity-60"
                  >
                    Ritirato
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          In preparazione
        </h2>
        {inCorso.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Niente in coda.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {inCorso.map((o) => (
              <li
                key={o.id}
                className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-surface text-2xl font-bold tabular-nums text-muted"
              >
                {o.numero}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
