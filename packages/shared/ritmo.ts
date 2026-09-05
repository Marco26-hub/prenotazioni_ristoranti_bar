"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Un ritmo che si ferma quando nessuno guarda.
 *
 * Le pagine che si aggiornano da sole — il conto sul telefono, il numero di
 * ritiro, la board di cucina — chiedevano al server ogni quattro o cinque
 * secondi, sempre, anche a telefono in tasca e a scheda in secondo piano.
 *
 * Un tavolo da quattro con i telefoni aperti un'ora sono quasi tremila
 * richieste; un locale da venti tavoli con tre turni ne fa cinque milioni al
 * mese. La maggior parte è per pagine che nessuno sta guardando: il telefono
 * è bloccato in tasca fra una portata e l'altra, la scheda è dietro a
 * WhatsApp, lo schermo della cucina è in stand-by fra un servizio e l'altro.
 *
 * Quindi: si aggiorna mentre la pagina è visibile, si ferma quando non lo è,
 * e riprende subito — con un giro immediato — appena si torna a guardarla,
 * perché la prima cosa che si vuole vedere è il dato fresco, non quello di
 * cinque minuti fa.
 *
 * Il rallentamento quando non cambia niente è l'altra metà: un tavolo che ha
 * ordinato e aspetta non ha bisogno di dodici richieste al minuto.
 */
export function useRitmo(
  azione: () => void | Promise<void>,
  opzioni: {
    /** Millisecondi fra un giro e l'altro quando qualcosa si muove. */
    svelto: number;
    /** Millisecondi quando non cambia niente da un po'. Assente: resta svelto. */
    lento?: number;
    /** Giri identici prima di rallentare. */
    giriPrimaDiRallentare?: number;
    /** Falso: sospende del tutto (per esempio a conto saldato). */
    attivo?: boolean;
  }
) {
  const {
    svelto,
    lento,
    giriPrimaDiRallentare = 6,
    attivo = true,
  } = opzioni;

  const azioneRef = useRef(azione);
  azioneRef.current = azione;

  /*
   * Il contatore dei giri a vuoto sta in un ref e non nello stato: farlo
   * cambiare a ogni giro rifarebbe il render della pagina dodici volte al
   * minuto per un numero che nessuno vede.
   */
  const aVuoto = useRef(0);
  const [visibile, setVisibile] = useState(true);

  useEffect(() => {
    const aggiorna = () => setVisibile(document.visibilityState === "visible");
    aggiorna();
    document.addEventListener("visibilitychange", aggiorna);
    return () => document.removeEventListener("visibilitychange", aggiorna);
  }, []);

  useEffect(() => {
    if (!attivo || !visibile) return;

    let vivo = true;
    let timer: ReturnType<typeof setTimeout>;

    const giro = async () => {
      await azioneRef.current();
      if (!vivo) return;
      aVuoto.current += 1;
      const attesa =
        lento && aVuoto.current >= giriPrimaDiRallentare ? lento : svelto;
      timer = setTimeout(giro, attesa);
    };

    // Un giro subito: tornando sulla pagina si vuole il dato di adesso.
    giro();

    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [attivo, visibile, svelto, lento, giriPrimaDiRallentare]);

  /**
   * Da chiamare quando qualcosa è cambiato davvero: rimette il ritmo svelto.
   * Senza, dopo il rallentamento un ordine appena partito si vedrebbe con
   * mezzo minuto di ritardo.
   */
  return () => {
    aVuoto.current = 0;
  };
}
