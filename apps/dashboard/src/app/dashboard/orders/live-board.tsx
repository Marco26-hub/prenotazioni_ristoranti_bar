"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRitmo } from "@repo/shared/ritmo";

import {
  setOrderItemStatus,
  advanceTableItems,
  trattieniRiga,
  trattieniTavolo,
} from "./actions";
import { segnalaDispositivo } from "../staff/dispositivi-actions";
import type { OrderItemStatus, StaffRole } from "@repo/shared";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tServizio } from "@/i18n/servizio";
import { creaRiconoscimento, interpreta, type Riconoscimento } from "./comando-vocale";

/** Le chiavi del dizionario di quest'area, per gli elenchi qui sotto. */
type ChiaveServizio = Parameters<ReturnType<typeof tServizio>>[0];

interface LiveItem {
  id: string;
  table_code: string;
  /**
   * Numero di ritiro, dove si consegna al bancone.
   *
   * Lì il numero è il tavolo: raggruppare per codice tavolo metteva dieci
   * clienti in fila dentro un'unica card intitolata "Banco", e il cuoco non
   * aveva modo di sapere quale piadina era di chi.
   */
  pickup_number: number | null;
  /**
   * L'ondata: tutte le righe partite con lo stesso invio.
   *
   * Serve a misurare l'attesa su quello che è appena stato ordinato invece
   * che sull'intera sessione del tavolo, che in un all you can eat dura il
   * turno.
   */
  order_id?: string;
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
  // Grigio: il cliente ha scelto ma non è ancora partito niente.
  pending: "border-l-4 border-l-zinc-500 bg-zinc-500/5",
  // Viola: la comanda è in coda e aspetta la cucina. Un colore suo, perché
  // "in coda" e "in cottura" sono due problemi diversi.
  sent_to_kitchen: "border-l-4 border-l-violet-500 bg-violet-500/10",
  preparing: "border-l-4 border-l-amber-500 bg-amber-500/10",
  ready: "border-l-4 border-l-sky-400 bg-sky-500/10",
  served: "border-l-4 border-l-emerald-500 bg-emerald-500/10 opacity-70",
};

/**
 * Il quadratino della legenda, dichiarato e non ricavato dalla classe della
 * riga: derivarlo a stringhe lasciava tre voci su cinque senza colore, e una
 * legenda incompleta è peggio di nessuna legenda.
 */
const LEGENDA_RIGA: Array<[string, ChiaveServizio, string]> = [
  ["pending", "legenda.pending", "bg-zinc-500"],
  ["sent_to_kitchen", "legenda.sent_to_kitchen", "bg-violet-500"],
  ["preparing", "legenda.preparing", "bg-amber-500"],
  ["ready", "legenda.ready", "bg-sky-500"],
  ["served", "legenda.served", "bg-emerald-500"],
];



/**
 * Il reparto scelto vale per QUESTO schermo, non per l'utente.
 *
 * Lo schermo del bar resta sul bar anche quando ci passa un altro operatore,
 * e lo stesso account aperto in cucina e al bar deve mostrare due cose
 * diverse. È una preferenza del dispositivo, quindi vive nel dispositivo.
 */
const CHIAVE_REPARTO = "comande.reparto";
const CHIAVE_DISPOSITIVO = "comande.dispositivo";

/** Identificativo dello schermo, generato qui e conservato qui. */
function chiaveDispositivo(): string {
  try {
    let k = localStorage.getItem(CHIAVE_DISPOSITIVO);
    if (!k) {
      k = crypto.randomUUID();
      localStorage.setItem(CHIAVE_DISPOSITIVO, k);
    }
    return k;
  } catch {
    return "";
  }
}

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

const DESTINAZIONE: Record<string, ChiaveServizio> = {
  sent_to_kitchen: "azione.sent_to_kitchen",
  preparing: "azione.preparing",
  ready: "azione.ready",
};

const ETICHETTA: Record<string, ChiaveServizio> = {
  sent_to_kitchen: "stato.sent_to_kitchen",
  preparing: "stato.preparing",
  ready: "stato.ready",
  served: "stato.served",
};

/** Ripiego se il locale non ha ancora scelto la sua soglia. */
const SOGLIA_PREDEFINITA = 20;

export function LiveBoard({
  ruolo,
  reparti,
}: {
  ruolo: StaffRole;
  /** Le postazioni di questo locale, coi nomi che ha scelto lui. */
  reparti: { chiave: string; etichetta: string }[];
}) {
  const lingua = useLingua();
  // Memoizzato perché entra nelle dipendenze dei callback qui sotto: un
  // traduttore nuovo a ogni render li rifarebbe tutti a ogni render.
  const t = useMemo(() => tServizio(lingua), [lingua]);

  /*
   * I nomi sono suoi.
   *
   * Chi ha chiamato "Pass" il punto in cui la sala ritira deve leggere
   * "Pass": un elenco fisso nel programma costringeva tutti in sei parole
   * che non erano le loro.
   */
  const etichettaReparto = (c: string | null) =>
    reparti.find((r) => r.chiave === (c ?? "cucina"))?.etichetta ??
    c ??
    t("reparto.cucina");

  const [items, setItems] = useState<LiveItem[]>([]);
  const [adesso, setAdesso] = useState(() => Date.now());
  const [vocale, setVocale] = useState(false);
  const [ultimoComando, setUltimoComando] = useState<string | null>(null);
  const [erroreVocale, setErroreVocale] = useState<string | null>(null);
  const [soloMiei, setSoloMiei] = useState(true);
  const [negato, setNegato] = useState<string | null>(null);
  // L'ultimo tentativo di aggiornamento non è riuscito: quello che si vede
  // a schermo non arriva più dal server.
  const [scollegato, setScollegato] = useState(false);
  const [soglia, setSoglia] = useState(SOGLIA_PREDEFINITA);
  // Lo stato della cassa: quanti documenti commerciali sono rimasti indietro
  // oggi e se il Registratore Telematico si fa ancora sentire.
  const [fiscale, setFiscale] = useState<{ errori: number; agenteFermo: boolean }>({
    errori: 0,
    agenteFermo: false,
  });
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
    () => creaRiconoscimento(lingua) !== null,
    () => false
  );

  /*
   * Al banco il numero è il tavolo.
   *
   * Raggruppando per codice tavolo, dieci clienti in fila finivano dentro
   * un'unica card intitolata "Banco": il cuoco vedeva venti piadine mescolate
   * e nessun modo di sapere quale fosse di chi. Dove c'è un numero di ritiro
   * è quello a fare da gruppo.
   */
  const chiaveGruppo = (i: LiveItem) =>
    i.pickup_number != null ? `N. ${i.pickup_number}` : i.table_code;

  /*
   * "N. " è un pezzo di protocollo, non una parola.
   *
   * La chiave di gruppo viaggia fino alla Server Action, che la riconosce
   * con un `like 'N. %'`: tradurla romperebbe l'azione in blocco al banco.
   * Si traduce solo quello che finisce sotto gli occhi.
   */
  const etichettaGruppo = (codice: string) =>
    codice.startsWith("N. ") ? t("banco.ritiro.n", { n: codice.slice(3) }) : codice;

  /*
   * Quello che questo schermo sta davvero guardando.
   *
   * Stava dentro il ciclo che raggruppa i tavoli, cioè dopo le azioni: le
   * azioni lavoravano su `items`, che è tutto il locale. Il comando vocale
   * cercava il tavolo lì dentro, e "tavolo 5 pronto" detto al banco crudo
   * mandava pronta anche la cucina — sullo stesso tavolo, ma sui piatti di
   * un altro. Ora il filtro è uno solo e sta prima di chi lo usa.
   */
  const haRango = items.some((i) => i.mio_tavolo);
  const visibili = items.filter(
    (i) =>
      !(soloMiei && haRango && !i.mio_tavolo) &&
      (reparto === "tutti" || (i.reparto ?? "cucina") === reparto)
  );

  const carica = useCallback(async () => {
    /*
     * Uno schermo fermo non deve sembrare uno schermo vuoto.
     *
     * Prima un fetch fallito usciva in silenzio: la board restava sull'ultimo
     * dato buono e continuava a sembrare aggiornata. In cucina è la peggiore
     * delle bugie — si guarda il monitor per sapere cosa manca, e un monitor
     * che ha smesso di parlare col server risponde "non manca niente".
     */
    let data;
    try {
      const res = await fetch("/api/orders-live");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch {
      setScollegato(true);
      return;
    }
    setItems(data.items);
    setScollegato(false);
    if (typeof data.soglia === "number") setSoglia(data.soglia);
    if (data.fiscale) {
      setFiscale({
        errori: Number(data.fiscale.errori) || 0,
        agenteFermo: Boolean(data.fiscale.agenteFermo),
      });
    }

    // Ci si presenta insieme ai dati, non con un timer proprio: uno schermo
    // che non carica comande non è in servizio, e non deve risultare acceso.
    const k = chiaveDispositivo();
    if (k) void segnalaDispositivo(k, leggiReparto());
  }, []);

  /*
   * Lo schermo della cucina si aggiorna quando qualcuno lo guarda.
   *
   * Fra un servizio e l'altro resta acceso su una pagina che nessuno vede, e
   * continuava a chiedere quindici volte al minuto — per ogni schermo del
   * locale, tutto il giorno. Quando la pagina torna in primo piano fa subito
   * un giro, perché la prima cosa che serve è lo stato di adesso.
   *
   * Non rallenta mai: in cucina quattro secondi sono il patto, e una comanda
   * che compare con venti secondi di ritardo è un piatto che parte tardi.
   */
  useRitmo(carica, { svelto: 4000 });

  useEffect(() => {
    const orologio = setInterval(() => setAdesso(Date.now()), 30_000);
    return () => clearInterval(orologio);
  }, []);

  const avanza = useCallback(
    async (item: LiveItem) => {
      const next = PROSSIMO[item.status];
      if (!next) return;
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
      try {
        const r = await setOrderItemStatus(item.id, next, item.status);
        if (r?.error) setNegato(r.error);
      } catch {
        // Azione fallita (sessione scaduta, rete, permessi): non lasciare a
        // schermo uno stato che il database non ha mai registrato — e dirlo.
        // Un piatto che torna indietro da solo, senza spiegazione, si legge
        // come un tocco andato a vuoto e si ripete.
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i))
        );
        setNegato(t("avviso.non_riuscito"));
      }
    },
    [t]
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
      } catch {
        setNegato(t("avviso.non_riuscito"));
      } finally {
        // Il ricarico rimette comunque a schermo quello che il database sa:
        // l'aggiornamento ottimistico non deve sopravvivere a un errore.
        await carica();
      }
    },
    [carica, t]
  );

  const trattieniIlTavolo = useCallback(
    async (codice: string, valore: boolean) => {
      try {
        await trattieniTavolo(codice, valore, reparto);
      } catch {
        setNegato(t("avviso.non_riuscito"));
      } finally {
        await carica();
      }
    },
    [carica, reparto, t]
  );

  const avanzaTavolo = useCallback(
    async (codice: string, da: OrderItemStatus, a: OrderItemStatus) => {
      // Anche l'anticipo a schermo rispetta il reparto: senza, le righe
      // della cucina saltavano avanti per un istante sullo schermo del
      // banco, per poi tornare indietro al ricarico.
      const suo = (i: LiveItem) =>
        reparto === "tutti" || (i.reparto ?? "cucina") === reparto;
      setItems((prev) =>
        prev.map((i) =>
          chiaveGruppo(i) === codice && i.status === da && suo(i)
            ? { ...i, status: a }
            : i
        )
      );
      try {
        // Il reparto dello schermo va passato: il bottone conta le righe
        // filtrate, e senza questo ne spostava molte di più di quante ne
        // aveva contate.
        const r = await advanceTableItems(codice, da, a, reparto);
        if (r.error) setNegato(r.error);
      } catch {
        // È il gesto che si usa davvero in cucina, ed era l'unico senza
        // rete di protezione: l'aggiornamento ottimistico spostava i piatti
        // a schermo e un errore li faceva tornare indietro senza una parola.
        setNegato(t("avviso.non_riuscito"));
      } finally {
        await carica();
      }
    },
    [carica, reparto, t]
  );

  // --- Comando vocale ------------------------------------------------------
  const eseguiComando = useCallback(
    async (frase: string) => {
      const azione = interpreta(frase);

      if (azione.tipo === "sconosciuto") {
        setUltimoComando(t("vocale.non_capito", { frase }));
        return;
      }

      // Chi parla dice "tavolo 3", il codice può essere "T3" o "3".
      const codice = visibili.find(
        (i) =>
          i.table_code === azione.tavolo ||
          i.table_code.replace(/^\D+/, "") === azione.tavolo
      )?.table_code;

      if (!codice) {
        setUltimoComando(t("vocale.tavolo.vuoto", { tavolo: azione.tavolo }));
        return;
      }

      if (azione.tipo === "trattieni") {
        const { aggiornate } = await trattieniTavolo(codice, azione.trattieni);
        await carica();
        const piatti = t.n(aggiornate, "vocale.piatti");
        setUltimoComando(
          aggiornate > 0
            ? t(
                azione.trattieni
                  ? "vocale.tavolo.trattenuti"
                  : "vocale.tavolo.mandati",
                { tavolo: codice, piatti }
              )
            : t(
                azione.trattieni
                  ? "vocale.tavolo.niente_trattenere"
                  : "vocale.tavolo.niente_mandare",
                { tavolo: codice }
              )
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

      const stato = t(ETICHETTA[azione.a]);
      setUltimoComando(
        aggiornate > 0
          ? t("vocale.tavolo.spostati", {
              tavolo: codice,
              piatti: t.n(aggiornate, "vocale.piatti"),
              stato,
            })
          : t("vocale.tavolo.niente_spostare", { tavolo: codice, stato })
      );
    },
    [visibili, carica, t]
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

    // La lingua va passata: un riconoscitore fermo sull'italiano restituisce
    // a chi detta in inglese una trascrizione che nessuna frase può
    // soddisfare, e il comando sembra rotto invece che nella lingua sbagliata.
    const r = creaRiconoscimento(lingua);
    if (!r) {
      setErroreVocale(t("vocale.errore.browser"));
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
          ? t("vocale.errore.microfono")
          : t("vocale.errore.interrotto", { errore: e.error })
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
      setErroreVocale(t("vocale.errore.avvio"));
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
  // I reparti da offrire nel selettore si contano su TUTTE le righe, non su
  // quelle visibili: filtrando sul bar, il bar resterebbe l'unica voce e non
  // si potrebbe più tornare indietro.
  const repartiPresenti = [...new Set(items.map((i) => i.reparto ?? "cucina"))].sort();

  const perTavolo = new Map<string, LiveItem[]>();
  for (const i of visibili) {
    const lista = perTavolo.get(chiaveGruppo(i)) ?? [];
    lista.push(i);
    perTavolo.set(chiaveGruppo(i), lista);
  }

  const tavoli = [...perTavolo.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      {/*
        La cassa ferma si scopre in cucina, non nei Corrispettivi.

        Quella pagina la aprono solo titolare e responsabile, e nessuno la
        apre durante il servizio: una stampante muta dalle 19:30 si scopriva
        a mezzanotte, con ottanta clienti già usciti senza documento
        commerciale. Qui sta in cima allo schermo che tutti guardano, e ci
        resta finché la cassa non riparte.
      */}
      {(fiscale.agenteFermo || fiscale.errori > 0) && (
        <div
          role="alert"
          className="mt-3 space-y-1 rounded-lg border-2 border-danger bg-danger/10 p-3 text-sm font-semibold text-danger"
        >
          {fiscale.agenteFermo && <p>{t("avviso.cassa.fermo")}</p>}
          {fiscale.errori > 0 && <p>{t.n(fiscale.errori, "avviso.cassa.errori")}</p>}
        </div>
      )}

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
          {vocale ? t("vocale.attivo") : t("vocale.attiva")}
        </button>

        {vocale && <p className="text-sm text-muted">{t("vocale.parla")}</p>}
        {!vocaleDisponibile && (
          <p className="text-sm text-muted">{t("vocale.non_disponibile")}</p>
        )}
      </div>

      {vocale && (
        <p className="mt-2 rounded-lg border border-border bg-surface p-3 text-xs text-muted">
          {t("vocale.privacy")}
        </p>
      )}

      {/* La didascalia sta sempre sotto, anche a microfono spento: chi non sa
          cosa può dire non accende l'ascolto. Mostra solo i comandi che il
          ruolo può davvero eseguire, altrimenti insegna frasi che verranno
          rifiutate. */}
      <details className="mt-3 rounded-lg border border-border bg-surface">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm">
          {t("vocale.aiuto.titolo")}
        </summary>
        <div className="space-y-2 px-3 pb-3 text-sm">
          <ul className="space-y-1">
            {consentiti.includes("preparing") && (
              <li>
                <strong>{t("vocale.aiuto.preparing")}</strong> —{" "}
                {t("vocale.aiuto.preparing.spiega")}
              </li>
            )}
            {consentiti.includes("ready") && (
              <li>
                <strong>{t("vocale.aiuto.ready")}</strong> —{" "}
                {t("vocale.aiuto.ready.spiega")}
              </li>
            )}
            {consentiti.includes("served") && (
              <li>
                <strong>{t("vocale.aiuto.served")}</strong> —{" "}
                {t("vocale.aiuto.served.spiega")}
              </li>
            )}
            <li>
              <strong>{t("vocale.aiuto.trattieni")}</strong> —{" "}
              {t("vocale.aiuto.trattieni.spiega")}
            </li>
            <li>
              <strong>{t("vocale.aiuto.manda")}</strong> —{" "}
              {t("vocale.aiuto.manda.spiega")}
            </li>
          </ul>
          <p className="text-muted">
            {t("vocale.aiuto.varianti")}
            {ruolo === "kitchen" && t("vocale.aiuto.cucina")}
            {ruolo === "waiter" && t("vocale.aiuto.sala")}
          </p>
        </div>
      </details>

      {/* Senza legenda cinque colori sono cinque indovinelli. */}
      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {LEGENDA_RIGA.filter(([k]) => items.some((i) => i.status === k)).map(
            ([k, testo, colore]) => (
              <li key={k} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`inline-block h-3 w-3 shrink-0 rounded-sm ${colore}`}
                />
                {t(testo)}
              </li>
            )
          )}
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-danger" />
            {t("legenda.ritardo")}
          </li>
        </ul>
      )}

      {scollegato && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-danger bg-danger/10 p-3 text-sm font-medium text-danger"
        >
          {t("avviso.scollegato")}
        </p>
      )}

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
          <span className="text-sm text-muted">{t("filtro.schermo")}</span>
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
              {r === "tutti" ? t("filtro.tutto") : etichettaReparto(r)}
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
            {t("filtro.miei_tavoli")}
          </button>
          <button
            type="button"
            onClick={() => setSoloMiei(false)}
            aria-pressed={!soloMiei}
            className={`min-h-11 rounded-full px-4 text-sm font-medium ${
              !soloMiei ? "bg-accent text-accent-foreground" : "border border-border"
            }`}
          >
            {t("filtro.tutta_sala")}
          </button>
        </div>
      )}

      {tavoli.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {soloMiei && haRango ? t("comande.vuoto.miei") : t("comande.vuoto")}
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

            /*
             * L'attesa è dell'ondata, non della sessione.
             *
             * In un all you can eat il tavolo resta aperto tutto il turno e
             * ci passano cinque ordini: misurando dal primo, a metà serata
             * ogni card era oltre soglia e il rosso non distingueva più
             * niente. Conta solo l'ondata più vecchia che ha ancora qualcosa
             * da preparare — un piatto già al passe o portato non è la
             * cucina che tarda, ed era proprio la riga dimenticata a 'ready'
             * a tenere accesa la card fino a fine serata.
             */
            const ondate = new Map<string, number>();
            for (const r of righe) {
              if (r.status === "ready" || r.status === "served" || r.held_at) continue;
              if (!r.created_at) continue;
              const nato = new Date(r.created_at).getTime();
              const chiave = r.order_id ?? r.created_at;
              const gia = ondate.get(chiave);
              if (gia === undefined || nato < gia) ondate.set(chiave, nato);
            }
            const piuVecchia =
              ondate.size === 0 ? null : Math.min(...ondate.values());
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
                  <p className="flex items-center gap-2">
                    <span className="text-sm uppercase tracking-wide text-muted">
                      {t("tavolo.etichetta")}
                    </span>
                    {/* Grande e fluo: in cucina si legge di sfuggita, di
                        lato, con le mani occupate. A schermo va l'etichetta,
                        non il codice grezzo: "N. 7" è la chiave che viaggia
                        fino all'action, e al banco inglese si legge "No. 7". */}
                    <span className="rounded-lg bg-lime-300 px-3 py-0.5 text-3xl font-black leading-tight tracking-tight text-zinc-900">
                      {etichettaGruppo(codice)}
                    </span>
                  </p>
                  {tuttoServito && (
                    <span className="text-sm font-medium text-success">
                      {t("tavolo.tutto_servito")}
                    </span>
                  )}
                  {!tuttoServito && attesaMin !== null && (
                    <span
                      className={`text-sm tabular-nums ${inRitardo ? "font-bold text-danger" : "text-muted"}`}
                    >
                      {t(inRitardo ? "tavolo.attesa.ritardo" : "tavolo.attesa", {
                        n: attesaMin,
                      })}
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
                            {t("riga.trattenuto")}
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
                          aria-label={t(
                            r.held_at ? "azione.manda.piatto" : "azione.trattieni.piatto",
                            { piatto: r.item_name }
                          )}
                          className={`flex min-h-11 items-center rounded-full border px-3 text-xs ${
                            r.held_at
                              ? "border-amber-500 bg-amber-500/20 font-medium"
                              : "border-border"
                          }`}
                        >
                          {t(r.held_at ? "azione.manda" : "azione.trattieni")}
                        </button>
                        {r.status === "served" ? (
                          <span className="px-2 text-xs font-medium text-success">
                            {t("riga.portato")}
                          </span>
                        ) : (
                          !r.held_at &&
                          (puoPortare(r.status) ? (
                            <button
                              type="button"
                              onClick={() => avanza(r)}
                              className="flex min-h-11 items-center rounded-full border border-border px-3 text-xs"
                            >
                              {t(DESTINAZIONE[r.status] ?? ETICHETTA[r.status])} →
                            </button>
                          ) : (
                            // Non un bottone spento: lo stato attuale, che è
                            // l'informazione che serve a chi non deve agire.
                            <span className="px-2 text-xs text-muted">
                              {t(ETICHETTA[r.status])}
                            </span>
                          ))
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Un tocco per tutto il tavolo: è così che escono i piatti. */}
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <div className="flex flex-wrap gap-2">
                    {daPreparare > 0 && consentiti.includes("preparing") && (
                      <button
                        type="button"
                        onClick={() => avanzaTavolo(codice, "sent_to_kitchen", "preparing")}
                        className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm"
                      >
                        {t("tavolo.tutti_preparazione", { n: daPreparare })}
                      </button>
                    )}
                    {inCorso > 0 && consentiti.includes("ready") && (
                      <button
                        type="button"
                        onClick={() => avanzaTavolo(codice, "preparing", "ready")}
                        className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground"
                      >
                        {t("tavolo.tutti_pronti", { n: inCorso })}
                      </button>
                    )}
                    {trattenuti > 0 && (
                      <button
                        type="button"
                        onClick={() => trattieniIlTavolo(codice, false)}
                        className="min-h-11 flex-1 rounded-full border border-amber-500 px-4 text-sm font-medium"
                      >
                        {t("tavolo.manda_trattenuti", { n: trattenuti })}
                      </button>
                    )}
                    {daPreparare + inCorso - trattenuti > 0 && (
                      <button
                        type="button"
                        onClick={() => trattieniIlTavolo(codice, true)}
                        className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm"
                      >
                        {t("tavolo.trattieni")}
                      </button>
                    )}
                  </div>

                  {/*
                    «Tutto servito» non torna indietro: nessun gesto della
                    board rimette un piatto da 'served' a 'ready'. Accanto a
                    «Tutto pronto», stessa pillola accento e stessa larghezza,
                    bastava un dito bagnato di lato per far sparire dal passe
                    cinque piatti che nessuno aveva portato. Quindi riga sua,
                    verde con la spunta invece che accento pieno: si distingue
                    anche di sfuggita e non si tocca per sbaglio mirando
                    all'altra.
                  */}
                  {pronti > 0 && consentiti.includes("served") && (
                    <button
                      type="button"
                      onClick={() => avanzaTavolo(codice, "ready", "served")}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-success bg-success/15 px-4 text-sm font-semibold text-success"
                    >
                      <span aria-hidden>✓</span>
                      {t("tavolo.tutti_serviti", { n: pronti })}
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
