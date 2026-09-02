/**
 * Listino della piattaforma.
 *
 * Client-safe di proposito: la pagina abbonamento mostra prezzi e vantaggi
 * senza dover interrogare Stripe a ogni render. Gli importi qui servono solo
 * a *mostrare* il prezzo; quello addebitato è sempre quello del Price su
 * Stripe, che resta l'unica fonte di verità per il denaro.
 */

export type BillingInterval = "month" | "year";

/**
 * I due pezzi vendibili separatamente.
 *
 * Un bar che vuole solo il menu QR e il pagamento al tavolo non deve pagare
 * le prenotazioni, e un ristorante che riempie a telefono ma vuole una
 * pagina dove farsi prenotare non deve comprare tutto il gestionale.
 */
export type Modulo = "ordini" | "prenotazioni";

export const MODULO_ETICHETTA: Record<Modulo, string> = {
  ordini: "Ordini e pagamenti al tavolo",
  prenotazioni: "Prenotazioni online",
};

export interface Plan {
  interval: BillingInterval;
  /** Chiave salvata in venues.subscription_plan e passata alle Server Action. */
  key: string;
  label: string;
  /** Cosa sblocca. */
  moduli: Modulo[];
  /** In centesimi, IVA esclusa. */
  amountCents: number;
  cadence: string;
  descrizione: string;
  note?: string;
}

export const TRIAL_DAYS = 14;

/**
 * Attivazione una tantum, dovuta sempre.
 *
 * Copre il lavoro che c'è davvero al primo giorno: menu caricato, QR
 * stampabili, Stripe collegato, marchio configurato. È la norma fra i
 * fornitori di cassa — EasyCassa 399 €, TheFork 300-400 €, Qamarero fino a
 * 500 €.
 *
 * Non si sconta sull'annuale: il lavoro di avviamento è lo stesso a
 * prescindere da come il locale paga il canone, e regalarlo insegnerebbe
 * che è trattabile. Lo sconto sull'annuale resta dov'è utile, cioè sui due
 * mesi di canone.
 */
export const SETUP_CENTS = 64900;

export function setupDovuto(_plan: Plan): boolean {
  return true;
}

export const PLANS: Plan[] = [
  {
    interval: "month",
    key: "ordini-mensile",
    label: "Ordini e pagamenti",
    moduli: ["ordini"],
    amountCents: 10900,
    cadence: "al mese",
    descrizione: "Menu QR, ordine al tavolo, conto alla romana, fattura elettronica.",
    note: "Disdetta in qualsiasi momento",
  },
  {
    interval: "month",
    key: "prenotazioni-mensile",
    label: "Solo prenotazioni",
    moduli: ["prenotazioni"],
    amountCents: 4900,
    cadence: "al mese",
    descrizione: "Pagina di prenotazione per il tuo sito, calendario e conferme.",
    note: "Senza gestionale di sala",
  },
  {
    interval: "month",
    key: "completo-mensile",
    label: "Tutto",
    moduli: ["ordini", "prenotazioni"],
    amountCents: 13900,
    cadence: "al mese",
    descrizione: "Ordini, pagamenti e prenotazioni insieme.",
    note: "19 € in meno dei due separati",
  },
  {
    interval: "year",
    key: "ordini-annuale",
    label: "Ordini e pagamenti",
    moduli: ["ordini"],
    amountCents: 109000,
    cadence: "all'anno",
    descrizione: "Menu QR, ordine al tavolo, conto alla romana, fattura elettronica.",
    note: "Due mesi in omaggio",
  },
  {
    interval: "year",
    key: "prenotazioni-annuale",
    label: "Solo prenotazioni",
    moduli: ["prenotazioni"],
    amountCents: 49000,
    cadence: "all'anno",
    descrizione: "Pagina di prenotazione per il tuo sito, calendario e conferme.",
    note: "Due mesi in omaggio",
  },
  {
    interval: "year",
    key: "completo-annuale",
    label: "Tutto",
    moduli: ["ordini", "prenotazioni"],
    amountCents: 139000,
    cadence: "all'anno",
    descrizione: "Ordini, pagamenti e prenotazioni insieme.",
    note: "Due mesi in omaggio",
  },
];

export function planByKey(key: string): Plan | undefined {
  return PLANS.find((p) => p.key === key);
}

/** Stati in cui il locale ha diritto a usare il servizio. */
const ENTITLED = new Set(["trialing", "active", "past_due"]);

/**
 * `past_due` è incluso di proposito: Stripe riprova l'addebito per giorni e
 * spegnere il servizio al primo tentativo fallito significherebbe fermare la
 * sala per una carta scaduta. La pagina mostra comunque un avviso.
 *
 * `periodEnd` è obbligatorio perché conta durante la prova: uno stato
 * 'trialing' senza scadenza vale servizio gratuito a tempo indeterminato.
 */
export function isEntitled(
  status: string | null | undefined,
  periodEnd?: Date | string | null
): boolean {
  if (!ENTITLED.has(status ?? "")) return false;
  if (status !== "trialing") return true;
  if (!periodEnd) return false;
  return new Date(periodEnd).getTime() > Date.now();
}

/**
 * Il locale può usare questo modulo?
 *
 * Durante la prova valgono tutti: chi prova deve poter vedere cosa compra.
 * Dopo, contano solo i moduli del piano sottoscritto — senza questo, un
 * locale che paga le sole prenotazioni avrebbe anche gli ordini, e i due
 * prezzi separati non avrebbero senso.
 */
export function hasModulo(
  modulo: Modulo,
  status: string | null | undefined,
  periodEnd: Date | string | null | undefined,
  moduli: string[] | null | undefined
): boolean {
  if (!isEntitled(status, periodEnd)) return false;
  if (status === "trialing") return true;
  return (moduli ?? []).includes(modulo);
}

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  none: "Nessun abbonamento",
  trialing: "Prova gratuita",
  active: "Attivo",
  past_due: "Pagamento non riuscito",
  canceled: "Disdetto",
  incomplete: "In attesa di pagamento",
  unpaid: "Non pagato",
};
