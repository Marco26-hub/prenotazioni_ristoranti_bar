"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { setOrderItemStatus, advanceTableItems } from "./actions";
import type { OrderItemStatus } from "@repo/shared";
import { creaRiconoscimento, interpreta, type Riconoscimento } from "./comando-vocale";

interface LiveItem {
  id: string;
  table_code: string;
  item_name: string;
  quantity: number;
  status: OrderItemStatus;
  notes: string | null;
  created_at?: string;
}

const PROSSIMO: Partial<Record<OrderItemStatus, OrderItemStatus>> = {
  sent_to_kitchen: "preparing",
  preparing: "ready",
  ready: "served",
};

const ETICHETTA: Record<string, string> = {
  sent_to_kitchen: "Da preparare",
  preparing: "In preparazione",
  ready: "Pronto",
  served: "Servito",
};

/** Oltre questi minuti una comanda va guardata, non aspettata. */
const SOGLIA_ATTESA_MIN = 20;

export function LiveBoard() {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [adesso, setAdesso] = useState(() => Date.now());
  const [vocale, setVocale] = useState(false);
  const [ultimoComando, setUltimoComando] = useState<string | null>(null);
  const [erroreVocale, setErroreVocale] = useState<string | null>(null);
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
        await setOrderItemStatus(item.id, next);
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

  const avanzaTavolo = useCallback(
    async (codice: string, da: OrderItemStatus, a: OrderItemStatus) => {
      setItems((prev) =>
        prev.map((i) =>
          i.table_code === codice && i.status === da ? { ...i, status: a } : i
        )
      );
      try {
        await advanceTableItems(codice, da, a);
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

      const da: OrderItemStatus =
        azione.a === "served" ? "ready" : azione.a === "ready" ? "preparing" : "sent_to_kitchen";

      const { aggiornate } = await advanceTableItems(codice, da, azione.a);
      await carica();

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
  const perTavolo = new Map<string, LiveItem[]>();
  for (const i of items) {
    if (i.status === "served") continue;
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
          <p className="text-sm text-muted">
            Di&apos; &laquo;tavolo 3 pronto&raquo; o &laquo;tavolo 3
            servito&raquo;.
          </p>
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

      {tavoli.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Nessun ordine in corso.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {tavoli.map(([codice, righe]) => {
            const daPreparare = righe.filter((r) => r.status === "sent_to_kitchen").length;
            const inCorso = righe.filter((r) => r.status === "preparing").length;
            const pronti = righe.filter((r) => r.status === "ready").length;

            const piuVecchia = righe.reduce<number | null>((acc, r) => {
              if (!r.created_at) return acc;
              const t = new Date(r.created_at).getTime();
              return acc === null || t < acc ? t : acc;
            }, null);
            const attesaMin =
              piuVecchia === null ? null : Math.floor((adesso - piuVecchia) / 60000);
            const inRitardo = attesaMin !== null && attesaMin >= SOGLIA_ATTESA_MIN;

            return (
              <li
                key={codice}
                className={`rounded-xl border bg-surface p-4 ${
                  pronti === righe.length
                    ? "border-success"
                    : inRitardo
                      ? "border-danger"
                      : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg font-semibold">Tavolo {codice}</p>
                  {attesaMin !== null && (
                    <span
                      className={`text-sm tabular-nums ${inRitardo ? "font-medium text-danger" : "text-muted"}`}
                    >
                      {attesaMin} min
                    </span>
                  )}
                </div>

                <ul className="mt-2 space-y-2">
                  {righe.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="tabular-nums font-medium">{r.quantity}×</span>{" "}
                        {r.item_name}
                        {r.notes && (
                          <span className="block text-sm italic text-muted">{r.notes}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => avanza(r)}
                        className="flex min-h-11 shrink-0 items-center rounded-full border border-border px-3 text-xs"
                      >
                        {ETICHETTA[r.status]} →
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Un tocco per tutto il tavolo: è così che escono i piatti. */}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  {daPreparare > 0 && (
                    <button
                      type="button"
                      onClick={() => avanzaTavolo(codice, "sent_to_kitchen", "preparing")}
                      className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm"
                    >
                      Tutto in preparazione ({daPreparare})
                    </button>
                  )}
                  {inCorso > 0 && (
                    <button
                      type="button"
                      onClick={() => avanzaTavolo(codice, "preparing", "ready")}
                      className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground"
                    >
                      Tutto pronto ({inCorso})
                    </button>
                  )}
                  {pronti > 0 && (
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
