/**
 * Listino dell'abbonamento alla piattaforma.
 *
 * Client-safe di proposito: la pagina abbonamento mostra prezzi e vantaggi
 * senza dover interrogare Stripe a ogni render. Gli importi qui servono solo
 * a *mostrare* il prezzo; quello addebitato è sempre quello del Price su
 * Stripe, che resta l'unica fonte di verità per il denaro.
 */

export type BillingInterval = "month" | "year";

export interface Plan {
  interval: BillingInterval;
  /** Chiave salvata in venues.subscription_plan e passata alle Server Action. */
  key: string;
  label: string;
  /** In centesimi, IVA esclusa. */
  amountCents: number;
  /** Testo del ricorrere, es. "al mese". */
  cadence: string;
  note?: string;
}

export const TRIAL_DAYS = 14;

export const PLANS: Plan[] = [
  {
    interval: "month",
    key: "mensile",
    label: "Mensile",
    amountCents: 4900,
    cadence: "al mese",
    note: "Disdetta in qualsiasi momento",
  },
  {
    interval: "year",
    key: "annuale",
    label: "Annuale",
    amountCents: 49000,
    cadence: "all'anno",
    note: "Due mesi in omaggio rispetto al mensile",
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
 * 'trialing' senza scadenza vale servizio gratuito a tempo indeterminato,
 * ed è esattamente il buco che c'era prima.
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

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  none: "Nessun abbonamento",
  trialing: "Prova gratuita",
  active: "Attivo",
  past_due: "Pagamento non riuscito",
  canceled: "Disdetto",
  incomplete: "In attesa di pagamento",
  unpaid: "Non pagato",
};
