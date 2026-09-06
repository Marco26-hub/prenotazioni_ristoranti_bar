"use client";

import { useState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tTavolo } from "@/i18n/tavolo";

/**
 * «In quanti siete?», chiesto una volta sola appena ci si siede.
 *
 * Non è una finestra sopra la pagina. Al tavolo, sul telefono, un pop-up è
 * la cosa che si chiude senza leggerla per arrivare al menu: resterebbe
 * senza risposta proprio nei tavoli pieni, che sono quelli dove serve. Sta
 * invece in cima, prima del menu, dove si passa comunque.
 *
 * E non blocca l'ordine. Chi non risponde ordina lo stesso — il conto lo
 * confermerà la sala, come faceva prima. Tenere fermo un tavolo appena
 * seduto in attesa di un cameriere sarebbe un modo di far odiare i QR.
 */
export function Coperti({
  sessionId,
  iniziali,
  dichiarati,
}: {
  sessionId: string;
  iniziali: number;
  /** Il tavolo ha già risposto: si mostra cosa ha detto, non la domanda. */
  dichiarati: boolean;
}) {
  const t = tTavolo(useLingua());
  const [scelti, setScelti] = useState(dichiarati ? iniziali : 0);
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function manda(n: number) {
    setInviando(true);
    setErrore(null);
    // Ottimistico: al tavolo un secondo di attesa fa premere due volte, e
    // due tocchi su due numeri diversi manderebbero l'ultimo per caso.
    const prima = scelti;
    setScelti(n);
    try {
      const res = await fetch("/api/coperti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, coperti: n }),
      });
      if (!res.ok) {
        const corpo = (await res.json().catch(() => null)) as { error?: string } | null;
        setScelti(prima);
        setErrore(corpo?.error ?? t("coperti.non_riuscito"));
      }
    } catch {
      setScelti(prima);
      setErrore(t("coperti.non_riuscito"));
    } finally {
      setInviando(false);
    }
  }

  if (scelti > 0) {
    return (
      <section className="mb-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm">
          {t.n(scelti, "coperti.detto")}{" "}
          <button
            type="button"
            onClick={() => setScelti(0)}
            className="underline underline-offset-2"
          >
            {t("coperti.correggi")}
          </button>
        </p>
        <p className="mt-1 text-xs text-muted">{t("coperti.in_attesa")}</p>
      </section>
    );
  }

  return (
    <section className="mb-4 rounded-xl border border-accent bg-surface p-4">
      <h2 className="text-base font-semibold">{t("coperti.domanda")}</h2>
      <p className="mt-1 text-xs text-muted">{t("coperti.perche")}</p>

      {/*
        Bottoni fino a dieci e poi un campo: dieci tocchi coprono quasi ogni
        tavolo, e su un telefono un tocco batte una tendina da scorrere. I
        tavoloni ci sono, ma sono l'eccezione e possono scrivere.
      */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={inviando}
            onClick={() => manda(n)}
            className="min-h-11 min-w-11 rounded-full border border-border px-3 font-medium disabled:opacity-60"
          >
            {n}
          </button>
        ))}
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-muted">
        {t("coperti.di_piu")}
        <input
          type="number"
          min="1"
          max="50"
          inputMode="numeric"
          disabled={inviando}
          // Non la stessa frase del titolo: un lettore di schermo la
          // annuncerebbe due volte, una come intestazione e una come campo.
          aria-label={t("coperti.campo")}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const n = Number((e.target as HTMLInputElement).value);
            if (Number.isInteger(n) && n >= 1 && n <= 50) void manda(n);
          }}
          onBlur={(e) => {
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n >= 1 && n <= 50) void manda(n);
          }}
          className="min-h-11 w-20 rounded-lg border border-border bg-background px-3 text-foreground"
        />
      </label>

      {errore && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {errore}
        </p>
      )}
    </section>
  );
}
