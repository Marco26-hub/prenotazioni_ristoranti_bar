"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  setOrderItemStatus,
  advanceTableItems,
  trattieniRiga,
  trattieniTavolo,
} from "./actions";
import type { OrderItemStatus, StaffRole } from "@repo/shared";
import { creaRiconoscimento, interpreta, type Riconoscimento } from "./comando-vocale";

interface LiveItem {
  id: string;
  table_code: string;
  item_name: string;
  quantity: number;
  status: OrderItemStatus;
  notes: string | null;
  created_at?: string;
  selected_options?: Array<{ opzione: string }>;
  held_at?: string | null;
  reparto?: string;
  mio_tavolo?: boolean;
  ultimo_da?: string | null;
}

const PROSSIMO: Partial<Record<OrderItemStatus, OrderItemStatus>> = {
  sent_to_kitchen: "preparing",
  preparing: "ready",
  ready: "served",
};

/**
 * Sul bottone va scritta la destinazione, non lo stato attuale.
 *
 * Prima diceva "Da preparare →" su un piatto che era da preparare, e si
 * leggeva come "portalo a: da preparare". Con le mani occupate e dieci righe
 * a schermo, un bottone deve dire cosa succede se lo premi.
 */
/**
 * Un colore per stato, sulla riga.
 *
 * Il grigio non è "spento": è una comanda che la cucina non ha ancora preso
 * in mano, ed è la cosa più vicina a un problema dopo il ritardo.
 */
const COLORE_RIGA: Record<string, string> = {
  pending: "border-l-4 border-l-border",
  sent_to_kitchen: "border-l-4 border-l-muted",
  preparing: "border-l-4 border-l-amber-500 bg-amber-500/5",
  ready: "border-l-4 border-l-sky-400 bg-sky-500/5",
  served: "border-l-4 border-l-success bg-success/5 opacity-70",
};

const REPARTI: Record<string, string> = {
  cucina: "Cucina",
  bar: "Bar",
  pizzeria: "Pizzeria",
  pasticceria: "Pasticceria",
};

/**
 * Il reparto scelto vale per QUESTO schermo, non per l'utente.
 *
 * Lo schermo del bar resta sul bar anche quando ci passa un altro operatore,
 * e lo stesso account aperto in cucina e al bar deve mostrare due cose
 * diverse. È una preferenza del dispositivo, quindi vive nel dispositivo.
 */
const CHIAVE_REPARTO = "comande.reparto";

const ascoltatori = new Set<() => void>();

function abbonatiReparto(fn: () => void) {
  ascoltatori.add(fn);
}
function disabbonatiReparto(fn: () => void) {
  ascoltatori.delete(fn);
}

function leggiReparto(): string {
  try {
    return localStorage.getItem(CHIAVE_REPARTO) ?? "tutti";
  } catch {
    return "tutti";
  }
}

function scegliReparto(r: string) {
  try {
    localStorage.setItem(CHIAVE_REPARTO, r);
  } catch {
    // Navigazione privata o storage pieno: vale per questa sessione soltanto.
  }
  for (const fn of ascoltatori) fn();
}

const DESTINAZIONE: Record<string, string> = {
  sent_to_kitchen: "Metti in preparazione",
  preparing: "Segna pronto",
  ready: "Segna servito",
};

const ETICHETTA: Record<string, string> = {
  sent_to_kitchen: "Da preparare",
  preparing: "In preparazione",
  ready: "Pronto",
  served: "Servito",
};

/** Ripiego se il locale non ha ancora scelto la sua soglia. */
const SOGLIA_PREDEFINITA = 20;

export function LiveBoard({ ruolo }: { ruolo: StaffRole }) {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [adesso, setAdesso] = useState(() => Date.now());
  const [vocale, setVocale] = useState(false);
  const [ultimoComando, setUltimoComando] = useState<string | null>(null);
  const [erroreVocale, setErroreVocale] = useState<string | null>(null);
  const [soloMiei, setSoloMiei] = useState(true);
  const [negato, setNegato] = useState<string | null>(null);
  const [soglia, setSoglia] = useState(SOGLIA_PREDEFINITA);
  // Letto dal dispositivo, non dallo stato: il server non sa cosa c'è nel
  // localStorage e leggerlo durante il render darebbe due HTML diversi. Con
  // useSyncExternalStore il primo render combacia col server e il valore vero
  // arriva subito dopo, senza un effetto che rincorra lo stato.
  const reparto = useSyncExternalStore(
    (notifica) => {
      abbonatiReparto(notifica);
      return () => disabbonatiReparto(notifica);
    },
    leggiReparto,
    () => "tutti"
  );

  // Stesso elenco che applica il server. Qui serve solo a non mostrare un
  // bottone che risponderebbe "non puoi": il controllo vero sta nell'action.
  const consentiti: OrderItemStatus[] =
    ruolo === "kitchen"
      ? ["preparing", "ready"]
      : ruolo === "waiter"
        ? ["sent_to_kitchen", "preparing", "served", "cancelled"]
        : ["pending", "sent_to_kitchen", "preparing", "ready", "served", "cancelled"];

  const puoPortare = (da: OrderItemStatus) => {
    const a = PROSSIMO[da];
    return a ? consentiti.includes(a) : false;
  };
  const riconoscimentoRef = useRef<Riconoscimento | null>(null);
  const vocaleDisponibile = useSyncExternalStore(
    () => () => {},
    () => creaRiconoscimento() !== null,
    () => false
  );

  const carica = useCallback(async () => {
    const res = await fetch("/api/orders-live");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items);
    if (typeof data.soglia === "number") setSoglia(data.soglia);
  }, []);

  useEffect(() => {
    // Il setState avviene dentro il fetch, dopo l'await, non sincrono nel
    // corpo dell'effect: qui la regola è un falso positivo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carica();
    const dati = setInterval(carica, 4000);
    const orologio = setInterval(() => setAdesso(Date.now()), 30_000);
    return () => {
      clearInterval(dati);
      clearInterval(orologio);
    };
  }, [carica]);

  const avanza = useCallback(
    async (item: LiveItem) => {
      const next = PROSSIMO[item.status];
      if (!next) return;
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
      try {
        const r = await setOrderItemStatus(item.id, next);
        if (r?.error) setNegato(r.error);
      } catch {
        // Azione fallita (sessione scaduta, permessi): non lasciare a schermo
        // uno stato che il database non ha mai registrato.
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i))
        );
      }
    },
    []
  );

  const trattieni = useCallback(
    async (r: LiveItem) => {
      // Ottimistico: sul palmare, con la sala piena, un secondo di attesa fa
      // premere due volte.
      setItems((prec) =>
        prec.map((x) =>
          x.id === r.id
            ? { ...x, held_at: r.held_at ? null : new Date().toISOString() }
            : x
        )
      );
      try {
        await trattieniRiga(r.id, !r.held_at);
      } finally {
        await carica();
      }
    },
    [carica]
  );

  const trattieniIlTavolo = useCallback(
    async (codice: string, valore: boolean) => {
      await trattieniTavolo(codice, valore);
      await carica();
    },
    [carica]
  );

  const avanzaTavolo = useCallback(
    async (codice: string, da: OrderItemStatus, a: OrderItemStatus) => {
      setItems((prev) =>
        prev.map((i) =>
          i.table_code === codice && i.status === da ? { ...i, status: a } : i
        )
      );
      try {
        const r = await advanceTableItems(codice, da, a);
        if (r.error) setNegato(r.error);
      } finally {
        await carica();
      }
    },
    [carica]
  );

  // --- Comando vocale ------------------------------------------------------
  const eseguiComando = useCallback(
    async (frase: string) => {
      const azione = interpreta(frase);

      if (azione.tipo === "sconosciuto") {
        setUltimoComando(`Non ho capito: "${frase}"`);
        return;
      }

      // Chi parla dice "tavolo 3", il codice può essere "T3" o "3".
      const codice = items.find(
        (i) =>
          i.table_code === azione.tavolo ||
          i.table_code.replace(/^\D+/, "") === azione.tavolo
      )?.table_code;

      if (!codice) {
        setUltimoComando(`Tavolo ${azione.tavolo}: nessuna comanda aperta`);
        return;
      }

      if (azione.tipo === "trattieni") {
        const { aggiornate } = await trattieniTavolo(codice, azione.trattieni);
        await carica();
        setUltimoComando(
          aggiornate > 0
            ? `Tavolo ${codice}: ${aggiornate} ${aggiornate === 1 ? "piatto" : "piatti"} ${azione.trattieni ? "trattenuti" : "mandati"}`
            : `Tavolo ${codice}: niente da ${azione.trattieni ? "trattenere" : "mandare"}`
        );
        return;
      }

      const da: OrderItemStatus =
        azione.a === "served" ? "ready" : azione.a === "ready" ? "preparing" : "sent_to_kitchen";

      const { aggiornate, error } = await advanceTableItems(codice, da, azione.a);
      await carica();

      // Un comando rifiutato per ruolo deve dirlo: a voce, senza risposta,
      // chi ha parlato crede di aver spostato la comanda.
      if (error) {
        setUltimoComando(error);
        return;
      }

      setUltimoComando(
        aggiornate > 0
          ? `Tavolo ${codice}: ${aggiornate} ${aggiornate === 1 ? "piatto" : "piatti"} → ${ETICHETTA[azione.a]}`
          : `Tavolo ${codice}: niente da spostare in ${ETICHETTA[azione.a]}`
      );
    },
    [items, carica]
  );

  const eseguiRef = useRef(eseguiComando);
  useEffect(() => {
    eseguiRef.current = eseguiComando;
  }, [eseguiComando]);

  function commutaVocale() {
    if (vocale) {
      riconoscimentoRef.current?.stop();
      setVocale(false);
      return;
    }

    const r = creaRiconoscimento();
    if (!r) {
      setErroreVocale("Questo browser non riconosce la voce. Usa Chrome o Safari.");
      return;
    }

    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) eseguiRef.current(res[0].transcript);
      }
    };
    r.onerror = (e) => {
      setErroreVocale(
        e.error === "not-allowed"
          ? "Microfono negato. Concedilo dalle impostazioni del browser."
          : `Riconoscimento interrotto (${e.error}).`
      );
      setVocale(false);
    };
    // Il riconoscimento continuo si spegne da solo dopo un po' di silenzio:
    // in cucina il silenzio è normale, quindi si riavvia finché è acceso.
    r.onend = () => {
      if (riconoscimentoRef.current === r) {
        try {
          r.start();
        } catch {
          setVocale(false);
        }
      }
    };

    riconoscimentoRef.current = r;
    setErroreVocale(null);
    try {
      r.start();
      setVocale(true);
    } catch {
      setErroreVocale("Non è stato possibile avviare il microfono.");
    }
  }

  useEffect(() => {
    return () => {
      const r = riconoscimentoRef.current;
      riconoscimentoRef.current = null;
      r?.abort();
    };
  }, []);

  // --- Raggruppamento per tavolo ------------------------------------------
  const haRango = items.some((i) => i.mio_tavolo);
  const repartiPresenti = [...new Set(items.map((i) => i.reparto ?? "cucina"))].sort();

  const perTavolo = new Map<string, LiveItem[]>();
  for (const i of items) {
    if (soloMiei && haRango && !i.mio_tavolo) continue;
    if (reparto !== "tutti" && (i.reparto ?? "cucina") !== reparto) continue;
    const lista = perTavolo.get(i.table_code) ?? [];
    lista.push(i);
    perTavolo.set(i.table_code, lista);
  }

  const tavoli = [...perTavolo.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={commutaVocale}
          disabled={!vocaleDisponibile}
          aria-pressed={vocale}
          className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium disabled:opacity-50 ${
            vocale
              ? "bg-accent text-accent-foreground"
              : "border border-border text-foreground"
          }`}
        >
          <span aria-hidden>{vocale ? "●" : "○"}</span>
          {vocale ? "Ascolto attivo" : "Comando vocale"}
        </button>

        {vocale && (
          <p className="text-sm text-muted">Parla al tavolo, non allo schermo.</p>
        )}
        {!vocaleDisponibile && (
          <p className="text-sm text-muted">
            Il comando vocale richiede Chrome o Safari.
          </p>
        )}
      </div>

      {vocale && (
        <p className="mt-2 rounded-lg border border-border bg-surface p-3 text-xs text-muted">
          Con l&apos;ascolto attivo il browser invia l&apos;audio al proprio
          servizio di trascrizione — su Chrome, ai server di Google. In cucina
          si parla di tutto: accendilo quando serve e spegnilo dopo.
        </p>
      )}

      {/* La didascalia sta sempre sotto, anche a microfono spento: chi non sa
          cosa può dire non accende l'ascolto. Mostra solo i comandi che il
          ruolo può davvero eseguire, altrimenti insegna frasi che verranno
          rifiutate. */}
      <details className="mt-3 rounded-lg border border-border bg-surface">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm">
          Comandi vocali che puoi usare
        </summary>
        <div className="space-y-2 px-3 pb-3 text-sm">
          <ul className="space-y-1">
            {consentiti.includes("preparing") && (
              <li>
                <strong>&laquo;tavolo 3 in preparazione&raquo;</strong> — la cucina
                lo prende in mano
              </li>
            )}
            {consentiti.includes("ready") && (
              <li>
                <strong>&laquo;tavolo 3 pronto&raquo;</strong> — è al passe, da
                portare
              </li>
            )}
            {consentiti.includes("served") && (
              <li>
                <strong>&laquo;tavolo 3 servito&raquo;</strong> — è arrivato al
                tavolo
              </li>
            )}
            <li>
              <strong>&laquo;ritarda il 3&raquo;</strong> — trattiene: la cucina
              non lo prepara
            </li>
            <li>
              <strong>&laquo;manda il 3&raquo;</strong> — libera quello che era
              trattenuto
            </li>
          </ul>
          <p className="text-muted">
            Vanno bene anche &laquo;pronto il tre&raquo;, &laquo;t7
            servito&raquo;, &laquo;aspetta il quattro&raquo;: il numero può
            essere detto a parole e l&apos;ordine non conta.
            {ruolo === "kitchen" &&
              " Segnare servito spetta alla sala: quel comando non ti risponde."}
            {ruolo === "waiter" &&
              " Segnare pronto spetta alla cucina: quel comando non ti risponde."}
          </p>
        </div>
      </details>

      {negato && (
        <p role="alert" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {negato}
        </p>
      )}

      {ultimoComando && (
        <p role="status" className="mt-2 text-sm font-medium">
          {ultimoComando}
        </p>
      )}
      {erroreVocale && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {erroreVocale}
        </p>
      )}

      {repartiPresenti.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">Questo schermo:</span>
          {["tutti", ...repartiPresenti].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => scegliReparto(r)}
              aria-pressed={reparto === r}
              className={`min-h-11 rounded-full px-4 text-sm font-medium ${
                reparto === r
                  ? "bg-accent text-accent-foreground"
                  : "border border-border"
              }`}
            >
              {r === "tutti" ? "Tutto" : (REPARTI[r] ?? r)}
            </button>
          ))}
        </div>
      )}

      {haRango && (
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Con quattro camerieri sullo stesso schermo, la lista intera è
              rumore: il proprio rango viene prima. Non è un permesso, è una
              vista — se un tavolo altrui chiama, si passa a tutta la sala. */}
          <button
            type="button"
            onClick={() => setSoloMiei(true)}
            aria-pressed={soloMiei}
            className={`min-h-11 rounded-full px-4 text-sm font-medium ${
              soloMiei ? "bg-accent text-accent-foreground" : "border border-border"
            }`}
          >
            I miei tavoli
          </button>
          <button
            type="button"
            onClick={() => setSoloMiei(false)}
            aria-pressed={!soloMiei}
            className={`min-h-11 rounded-full px-4 text-sm font-medium ${
              !soloMiei ? "bg-accent text-accent-foreground" : "border border-border"
            }`}
          >
            Tutta la sala
          </button>
        </div>
      )}

      {tavoli.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {soloMiei && haRango
            ? "Nessun ordine sui tuoi tavoli."
            : "Nessun ordine in corso."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {tavoli.map(([codice, righe]) => {
            // I trattenuti non entrano nei conteggi: "tutto in preparazione"
            // deve dire quanto parte davvero.
            const daPreparare = righe.filter(
              (r) => r.status === "sent_to_kitchen" && !r.held_at
            ).length;
            const inCorso = righe.filter(
              (r) => r.status === "preparing" && !r.held_at
            ).length;
            // Anche i pronti: un piatto cotto ma trattenuto esiste — si
            // aspetta che il tavolo finisca gli antipasti — e l'azione in
            // blocco lo salta, quindi il conteggio deve saltarlo pure.
            const pronti = righe.filter(
              (r) => r.status === "ready" && !r.held_at
            ).length;
            const trattenuti = righe.filter((r) => r.held_at).length;
            // Tutto arrivato: al tavolo non manca niente, e si vede da lontano.
            const tuttoServito = righe.every((r) => r.status === "served");

            const piuVecchia = righe.reduce<number | null>((acc, r) => {
              // Un piatto già portato non è più un'attesa.
              if (r.status === "served" || r.held_at) return acc;
              if (!r.created_at) return acc;
              const t = new Date(r.created_at).getTime();
              return acc === null || t < acc ? t : acc;
            }, null);
            const attesaMin =
              piuVecchia === null ? null : Math.floor((adesso - piuVecchia) / 60000);
            // Zero spegne l'allarme: chi non lo vuole addosso tutta la sera
            // non deve vederlo lampeggiare.
            const inRitardo = soglia > 0 && attesaMin !== null && attesaMin >= soglia;

            return (
              <li
                key={codice}
                className={`rounded-xl border bg-surface p-4 ${
                  tuttoServito
                    ? "border-2 border-success bg-success/10"
                    : inRitardo
                      ? "animate-pulse border-2 border-danger bg-danger/10"
                      : pronti > 0
                        ? "border-2 border-sky-400 bg-sky-500/10"
                        : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg font-semibold">Tavolo {codice}</p>
                  {tuttoServito && (
                    <span className="text-sm font-medium text-success">
                      tutto servito
                    </span>
                  )}
                  {!tuttoServito && attesaMin !== null && (
                    <span
                      className={`text-sm tabular-nums ${inRitardo ? "font-bold text-danger" : "text-muted"}`}
                    >
                      {attesaMin} min{inRitardo ? " · in ritardo" : ""}
                    </span>
                  )}
                </div>

                <ul className="mt-2 space-y-2">
                  {righe.map((r) => (
                    <li
                      key={r.id}
                      className={`flex flex-col gap-2 rounded-r py-1 pl-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 ${
                        COLORE_RIGA[r.status] ?? ""
                      }`}
                    >
                      <span className="min-w-0 text-pretty">
                        <span className="tabular-nums font-medium">{r.quantity}×</span>{" "}
                        {r.item_name}
                        {/* Senza le scelte la cucina prepara la variante
                            sbagliata: vanno più in evidenza della nota. */}
                        {r.selected_options && r.selected_options.length > 0 && (
                          <span className="block text-sm font-medium text-accent">
                            {r.selected_options.map((o) => o.opzione).join(" · ")}
                          </span>
                        )}
                        {r.notes && (
                          <span className="block text-sm italic text-muted">{r.notes}</span>
                        )}
                        {r.held_at && (
                          <span className="mt-0.5 block text-sm font-medium text-amber-600">
                            Trattenuto — non preparare
                          </span>
                        )}
                        {/* Chi ha mosso la riga per ultimo. Con più palmari,
                            "servito" senza un nome accanto non risponde alla
                            domanda che si fa quando il piatto non è arrivato. */}
                        {r.ultimo_da && (
                          <span className="block text-xs text-muted">{r.ultimo_da}</span>
                        )}
                      </span>
                      <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => trattieni(r)}
                          aria-label={
                            r.held_at
                              ? `Manda ora ${r.item_name}`
                              : `Ritarda ${r.item_name}`
                          }
                          className={`flex min-h-11 items-center rounded-full border px-3 text-xs ${
                            r.held_at
                              ? "border-amber-500 bg-amber-500/20 font-medium"
                              : "border-border"
                          }`}
                        >
                          {r.held_at ? "Manda ora" : "Ritarda"}
                        </button>
                        {r.status === "served" ? (
                          <span className="px-2 text-xs font-medium text-success">
                            portato
                          </span>
                        ) : (
                          !r.held_at &&
                          (puoPortare(r.status) ? (
                            <button
                              type="button"
                              onClick={() => avanza(r)}
                              className="flex min-h-11 items-center rounded-full border border-border px-3 text-xs"
                            >
                              {DESTINAZIONE[r.status] ?? ETICHETTA[r.status]} →
                            </button>
                          ) : (
                            // Non un bottone spento: lo stato attuale, che è
                            // l'informazione che serve a chi non deve agire.
                            <span className="px-2 text-xs text-muted">
                              {ETICHETTA[r.status]}
                            </span>
                          ))
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Un tocco per tutto il tavolo: è così che escono i piatti. */}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  {daPreparare > 0 && consentiti.includes("preparing") && (
                    <button
                      type="button"
                      onClick={() => avanzaTavolo(codice, "sent_to_kitchen", "preparing")}
                      className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm"
                    >
                      Tutto in preparazione ({daPreparare})
                    </button>
                  )}
                  {inCorso > 0 && consentiti.includes("ready") && (
                    <button
                      type="button"
                      onClick={() => avanzaTavolo(codice, "preparing", "ready")}
                      className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground"
                    >
                      Tutto pronto ({inCorso})
                    </button>
                  )}
                  {trattenuti > 0 && (
                    <button
                      type="button"
                      onClick={() => trattieniIlTavolo(codice, false)}
                      className="min-h-11 flex-1 rounded-full border border-amber-500 px-4 text-sm font-medium"
                    >
                      Manda i {trattenuti} trattenuti
                    </button>
                  )}
                  {daPreparare + inCorso - trattenuti > 0 && (
                    <button
                      type="button"
                      onClick={() => trattieniIlTavolo(codice, true)}
                      className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm"
                    >
                      Ritarda il tavolo
                    </button>
                  )}
                  {pronti > 0 && consentiti.includes("served") && (
                    <button
                      type="button"
                      onClick={() => avanzaTavolo(codice, "ready", "served")}
                      className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground"
                    >
                      Tutto servito ({pronti})
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
