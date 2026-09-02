"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Stato {
  prenotazioniDaConfermare: number;
  ultimaPrenotazione: string | null;
  piattiAlPasse: number;
}

/** Ogni mezzo minuto: una prenotazione non è un ordine, può attendere. */
const INTERVALLO_MS = 30_000;

/**
 * Avvisi in tempo reale nel gestionale.
 *
 * Il locale tiene questa pagina aperta per tutto il servizio: quando arriva
 * una prenotazione deve accorgersene senza andarla a cercare. Confronta
 * l'istante dell'ultima richiesta con quello visto prima, così un conteggio
 * fermo non fa suonare nulla e una richiesta nuova sì.
 */
export function Notifiche() {
  const [stato, setStato] = useState<Stato | null>(null);
  const [nuova, setNuova] = useState(false);
  const ultimaVista = useRef<string | null>(null);
  const primoGiro = useRef(true);

  const suona = useCallback(() => {
    // Un tono breve generato al momento: nessun file da caricare, e nessun
    // suono se il browser non ha ancora avuto un'interazione dall'utente.
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio negato: l'avviso visivo basta.
    }
  }, []);

  const controlla = useCallback(async () => {
    const res = await fetch("/api/notifiche");
    if (!res.ok) return;
    const d = (await res.json()) as Stato;
    setStato(d);

    // Al primo giro si prende nota di com'è la situazione senza avvisare:
    // aprendo il gestionale non deve suonare per richieste già viste ieri.
    if (primoGiro.current) {
      primoGiro.current = false;
      ultimaVista.current = d.ultimaPrenotazione;
      return;
    }

    if (d.ultimaPrenotazione && d.ultimaPrenotazione !== ultimaVista.current) {
      ultimaVista.current = d.ultimaPrenotazione;
      setNuova(true);
      suona();
    }
  }, [suona]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    controlla();
    const t = setInterval(controlla, INTERVALLO_MS);
    return () => clearInterval(t);
  }, [controlla]);

  const daConfermare = stato?.prenotazioniDaConfermare ?? 0;
  if (daConfermare === 0) return null;

  return (
    <div
      role="status"
      className={`border-b px-4 py-2 text-sm ${
        nuova
          ? "border-accent bg-accent text-accent-foreground"
          : "border-amber-300 bg-amber-50 text-amber-900"
      }`}
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
        <span>
          {nuova ? "Nuova prenotazione: " : ""}
          {daConfermare}{" "}
          {daConfermare === 1 ? "richiesta da confermare" : "richieste da confermare"}
        </span>
        <Link
          href="/dashboard/reservations"
          onClick={() => setNuova(false)}
          className="flex min-h-11 items-center rounded-full border border-current px-4 text-sm font-medium"
        >
          Vedi
        </Link>
      </div>
    </div>
  );
}
