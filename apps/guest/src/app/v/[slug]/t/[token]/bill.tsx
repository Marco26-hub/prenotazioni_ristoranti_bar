"use client";

import { useEffect, useState, useCallback } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatPriceCents } from "@repo/shared";
import { useRitmo } from "@repo/shared/ritmo";

interface UnpaidItem {
  id: string;
  name: string;
  quantity: number;
  totalCents: number;
}

interface BillState {
  balanceCents: number;
  /** Quanto e gia stato incassato su questa sessione. */
  paidCents: number;
  currency: string;
  stripeAccountId: string | null;
  satispayEnabled: boolean;
  tipsEnabled: boolean;
  tipPercents: number[];
  googleReviewUrl: string | null;
  unpaidItems: UnpaidItem[];
  /** Presente solo se il tavolo è a prezzo fisso. */
  formula: {
    fascia: "pranzo" | "cena";
    prezzoUnitarioCents: number;
    adulti: number;
    bambini: number;
    prezzoBambinoCents: number | null;
    supplementoCents: number;
    totaleCents: number;
  } | null;
}

const stripeCache = new Map<string, Promise<Stripe | null>>();

function getStripe(accountId: string): Promise<Stripe | null> {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return Promise.resolve(null);
  if (!stripeCache.has(accountId)) {
    stripeCache.set(accountId, loadStripe(key, { stripeAccount: accountId }));
  }
  return stripeCache.get(accountId)!;
}

export function Bill({
  sessionId,
  privacyHref,
  token,
}: {
  sessionId: string;
  privacyHref: string;
  token: string;
}) {
  const [bill, setBill] = useState<BillState | null>(null);
  // L'ultimo aggiornamento non è riuscito: l'importo a schermo può non
  // essere più quello vero.
  const [fermo, setFermo] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [tipCents, setTipCents] = useState(0);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [contanti, setContanti] = useState(false);
  const [documento, setDocumento] = useState<"scontrino" | "fattura">("scontrino");
  const [chiamato, setChiamato] = useState<string | null>(null);
  const [chiamando, setChiamando] = useState(false);

  const chiamaPerContanti = async () => {
    setChiamando(true);
    setError(null);
    try {
      const res = await fetch("/api/chiamate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, motivo: "contanti", documento }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Non riesco a chiamare il personale");
      else setChiamato(data.messaggio);
    } catch {
      setError("Nessuna connessione: chiama il personale a voce");
    } finally {
      setChiamando(false);
    }
  };

  const refreshBill = useCallback(async () => {
    /*
     * Un conto fermo non deve sembrare un conto aggiornato.
     *
     * Prima un fetch fallito usciva in silenzio e restava a schermo l'ultimo
     * importo buono: chi ordinava ancora vedeva il vecchio totale e lo
     * prendeva per quello da pagare. È il numero su cui la gente decide
     * quanto mettere sul tavolo, quindi se non è più fresco va detto.
     */
    let data: BillState & { sessionStatus: string };
    try {
      const res = await fetch(`/api/bill?sessionId=${sessionId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = (await res.json()) as BillState & { sessionStatus: string };
    } catch {
      setFermo(true);
      return;
    }
    setFermo(false);
    setBill(data);
    /*
     * "Saldato" lo decide il saldo, non il fatto che un pagamento sia
     * riuscito: pagando solo i propri piatti alla romana, il tavolo deve
     * ancora il resto, e dichiararlo chiuso su quel telefono faceva credere
     * di aver pagato tutto — con la ricevuta dell'intera sessione.
     *
     * Ma saldo zero da solo non basta: un tavolo che non ha ancora ordinato
     * ha saldo zero e non ha saldato niente. Serve che ci sia stato qualcosa
     * da pagare, cioè un conto che era aperto e adesso non lo è più.
     */
    setPaid(
      data.sessionStatus === "closed" ||
        (data.paidCents > 0 && data.balanceCents <= 0)
    );
  }, [sessionId]);

  /*
   * Si aggiorna mentre qualcuno guarda, non a telefono in tasca.
   *
   * Fra una portata e l'altra il telefono è bloccato o la scheda è dietro a
   * WhatsApp, e il conto continuava a chiedere dodici volte al minuto: la
   * maggior parte delle richieste era per una pagina che nessuno stava
   * guardando. Rallenta anche quando l'importo non si muove, e si ferma del
   * tutto a conto saldato — lì non cambia più niente per definizione.
   */
  useRitmo(refreshBill, {
    svelto: 5000,
    lento: 20000,
    attivo: !paid,
  });

  useEffect(() => {
    // Il setState avviene dentro il fetch async (dopo l'await), non
    // sincrono nel corpo dell'effect — pattern standard fetch-on-mount,
    // la regola set-state-in-effect qui è un falso positivo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshBill();
    // Polling semplice: più ospiti allo stesso tavolo possono ordinare in
    // parallelo, il conto deve riflettere gli ordini altrui senza reload manuale.
    // Il ritmo lo tiene useRitmo qui sopra: si ferma quando la pagina non è
    // visibile e a conto saldato.
  }, [refreshBill]);

  const startCheckout = async () => {
    setError(null);
    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tipCents,
          ...(splitMode && selectedItems.length > 0 ? { orderItemIds: selectedItems } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore avvio pagamento");
        return;
      }
      setClientSecret(data.clientSecret);
    } catch {
      setError("Connessione assente — riprova.");
    }
  };

  const startSatispayCheckout = async () => {
    setError(null);
    try {
      const res = await fetch("/api/payments/create-satispay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, tipCents }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore avvio pagamento Satispay");
        return;
      }
      // Satispay non offre un widget embeddable: il pagamento si completa
      // sulla loro pagina/app, poi torna sul redirect_url configurato.
      window.location.href = data.redirectUrl;
    } catch {
      setError("Connessione assente — riprova.");
    }
  };

  if (!bill) return null;

  if (paid) {
    return (
      <section className="mt-8 space-y-4 rounded-xl border border-border bg-surface p-5">
        <p className="font-medium text-success">Conto saldato, grazie!</p>

        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href={`/api/receipts/${sessionId}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center rounded-full border border-border px-5 text-center text-sm font-medium hover:bg-background focus-visible:ring-2 focus-visible:ring-accent"
          >
            Ricevuta di pagamento
          </a>
          <InvoiceRequest sessionId={sessionId} privacyHref={privacyHref} />
        </div>
        <p className="text-xs text-muted">
          La ricevuta di pagamento non sostituisce lo scontrino fiscale. Per la
          fattura elettronica inserisci i dati fiscali.
        </p>

        {/* Il momento subito dopo il pagamento è quello in cui le persone
            sono più disposte a lasciare una recensione: chiederla dopo, per
            email, funziona molto meno. */}
        {bill.googleReviewUrl && (
          <a
            href={bill.googleReviewUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center rounded-full bg-accent px-5 font-medium text-accent-foreground"
          >
            Lascia una recensione
          </a>
        )}

      </section>
    );
  }

  if (bill.balanceCents <= 0) return null;

  const payableCents = splitMode
    ? bill.unpaidItems
        .filter((i) => selectedItems.includes(i.id))
        .reduce((sum, i) => sum + i.totalCents, 0)
    : bill.balanceCents;

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Il conto</h2>
        <span className="text-xl font-semibold tabular-nums">
          {formatPriceCents(bill.balanceCents, bill.currency)}
        </span>
      </div>

      {/*
        A formula il totale non torna con la somma dei piatti, ed è giusto
        così: qui si dice da dove viene. Un conto che non si spiega è il
        primo motivo per chiamare il cameriere.
      */}
      {fermo && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Il conto non si sta aggiornando: quello che vedi potrebbe non essere
          l&apos;importo corrente. Controlla la connessione, o chiedi al
          personale.
        </p>
      )}

      {bill.formula && (
        <dl className="mb-4 space-y-1 rounded-lg bg-background p-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt>
              Formula {bill.formula.fascia}
              {bill.formula.adulti > 0 && (
                <> · {bill.formula.adulti} × {formatPriceCents(bill.formula.prezzoUnitarioCents, bill.currency)}</>
              )}
            </dt>
            <dd className="tabular-nums">
              {formatPriceCents(
                bill.formula.adulti * bill.formula.prezzoUnitarioCents,
                bill.currency
              )}
            </dd>
          </div>

          {bill.formula.bambini > 0 && (
            <div className="flex justify-between gap-3">
              <dt>
                {bill.formula.bambini}{" "}
                {bill.formula.bambini === 1 ? "bambino" : "bambini"}
                {bill.formula.prezzoBambinoCents !== null && (
                  <>
                    {" "}· {formatPriceCents(bill.formula.prezzoBambinoCents, bill.currency)}
                  </>
                )}
              </dt>
              <dd className="tabular-nums">
                {formatPriceCents(
                  bill.formula.bambini *
                    (bill.formula.prezzoBambinoCents ?? bill.formula.prezzoUnitarioCents),
                  bill.currency
                )}
              </dd>
            </div>
          )}

          {bill.formula.supplementoCents > 0 && (
            <div className="flex justify-between gap-3">
              <dt>Supplemento per l&apos;avanzato</dt>
              <dd className="tabular-nums">
                {formatPriceCents(bill.formula.supplementoCents, bill.currency)}
              </dd>
            </div>
          )}

          <p className="pt-1 text-xs text-muted">
            I piatti della formula sono compresi. Dolci, caffè, amari, bevande e
            le voci segnate come extra si pagano a parte e li trovi qui sotto.
          </p>
        </dl>
      )}

      {!bill.stripeAccountId && !bill.satispayEnabled && (
        <p className="rounded-lg bg-background p-3 text-sm text-muted">
          Il pagamento con carta non è attivo in questo locale: si paga in
          contanti al tavolo.
        </p>
      )}

      {(bill.stripeAccountId || bill.satispayEnabled) && !clientSecret && (
        <div className="space-y-3">
          {bill.unpaidItems.length > 1 && (
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode(false);
                    setSelectedItems([]);
                  }}
                  className={`rounded border px-3 py-1 text-sm ${!splitMode ? "bg-accent text-accent-foreground" : ""}`}
                >
                  Pago tutto
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode(true)}
                  className={`rounded border px-3 py-1 text-sm ${splitMode ? "bg-accent text-accent-foreground" : ""}`}
                >
                  Pago solo i miei piatti
                </button>
              </div>

              {splitMode && (
                <ul className="space-y-1">
                  {bill.unpaidItems.map((item) => (
                    <li key={item.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) =>
                            setSelectedItems((prev) =>
                              e.target.checked
                                ? [...prev, item.id]
                                : prev.filter((id) => id !== item.id)
                            )
                          }
                        />
                        <span>
                          {item.quantity}× {item.name} —{" "}
                          {formatPriceCents(item.totalCents, bill.currency)}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {bill.tipsEnabled && (
            <div>
              <label className="mb-1 block text-sm">Mancia per il personale</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTipCents(0)}
                  className={`min-h-10 rounded-full border border-border px-4 text-sm ${
                    tipCents === 0 ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  Nessuna
                </button>
                {bill.tipPercents.map((pct, i) => {
                  const cents = Math.round((payableCents * pct) / 100);
                  // La percentuale centrale è quella suggerita: è quella che
                  // sceglie la maggior parte delle persone, indicarlo aiuta
                  // chi non sa quanto lasciare.
                  const suggested = i === Math.floor(bill.tipPercents.length / 2);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setTipCents(cents)}
                      className={`min-h-10 rounded-full border px-4 text-sm ${
                        tipCents === cents
                          ? "border-accent bg-accent text-accent-foreground"
                          : suggested
                            ? "border-accent"
                            : "border-border"
                      }`}
                    >
                      {pct}%
                      <span className="ml-1 opacity-70">
                        {formatPriceCents(cents, bill.currency)}
                      </span>
                      {suggested && <span className="ml-1 text-xs">· più scelta</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {bill.stripeAccountId && (
            <button
              type="button"
              onClick={startCheckout}
              disabled={splitMode && selectedItems.length === 0}
              className="min-h-12 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
            >
              Paga con carta — {formatPriceCents(payableCents + tipCents, bill.currency)}
            </button>
          )}

          {bill.satispayEnabled && splitMode && (
            <p className="text-xs text-muted">
              Satispay al momento accetta solo il pagamento dell&apos;intero conto.
            </p>
          )}

          {bill.satispayEnabled && !splitMode && (
            <button
              type="button"
              onClick={startSatispayCheckout}
              className="min-h-12 w-full rounded-full border border-border font-medium active:scale-95"
            >
              Paga con Satispay — {formatPriceCents(bill.balanceCents + tipCents, bill.currency)}
            </button>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}

      {/* Fuori dal blocco che richiede Stripe o Satispay: il contante non
          passa da nessun circuito, e un locale che incassa solo in cassa —
          proprio quello che di provider non ne ha — restava senza il
          bottone che gli serve di più. */}
      {/* Il contante non passa da nessun circuito: qui il software non
          può concludere, può solo far arrivare qualcuno al tavolo con il
          documento giusto. */}
      {!contanti ? (
        <button
          type="button"
          onClick={() => setContanti(true)}
          className="min-h-12 w-full rounded-full border border-border font-medium active:scale-95"
        >
          Pago in contanti
        </button>
      ) : chiamato ? (
        <p
          role="status"
          className="rounded-xl border border-success bg-success/10 p-4 text-center font-medium"
        >
      {chiamato}
        </p>
      ) : (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="font-medium">Paghi al tavolo in contanti</p>
          <fieldset>
            <legend className="mb-2 text-sm text-muted">
              Cosa ti serve
            </legend>
            <div className="flex gap-2">
          {(["scontrino", "fattura"] as const).map((d) => (
                <label
                  key={d}
                  className={`flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-full border text-sm font-medium ${
                    documento === d ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="documento"
                    checked={documento === d}
                    onChange={() => setDocumento(d)}
                    className="sr-only"
                  />
              {d === "scontrino" ? "Scontrino" : "Fattura"}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            onClick={chiamaPerContanti}
            disabled={chiamando}
            className="min-h-12 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-60"
          >
        {chiamando ? "Chiamo…" : "Chiama il cameriere"}
          </button>
          <button
            type="button"
            onClick={() => setContanti(false)}
            className="min-h-11 w-full text-sm underline underline-offset-4"
          >
            Torna ai pagamenti
          </button>
        </div>
      )}



      {bill.stripeAccountId && clientSecret && (
        <CheckoutForm
          accountId={bill.stripeAccountId}
          clientSecret={clientSecret}
          onSuccess={() => {
            // Nessuna scorciatoia: si ricarica il conto e il saldo dice se è
            // finita davvero.
            setClientSecret(null);
            refreshBill();
          }}
        />
      )}
    </section>
  );
}

function CheckoutForm({
  accountId,
  clientSecret,
  onSuccess,
}: {
  accountId: string;
  clientSecret: string;
  onSuccess: () => void;
}) {
  const [stripePromise] = useState(() => getStripe(accountId));

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm onSuccess={onSuccess} />
    </Elements>
  );
}

function InvoiceRequest({
  sessionId,
  privacyHref,
}: {
  sessionId: string;
  privacyHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"privato" | "azienda" | "estero">("privato");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [taxId, setTaxId] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressProvince, setAddressProvince] = useState("");
  const [sdiCode, setSdiCode] = useState("");
  const [pec, setPec] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const common = { email, addressStreet, addressZip, addressCity };
    const customer = type === "privato"
      ? {
          ...common,
          type: "privato" as const,
          firstName,
          lastName,
          fiscalCode,
          addressProvince,
          pec: pec || undefined,
        }
      : type === "azienda"
        ? {
            ...common,
            type: "azienda" as const,
            companyName,
            vatNumber: vatNumber.replace(/^IT/i, ""),
            addressProvince,
            sdiCode: sdiCode || undefined,
            pec: pec || undefined,
          }
        : {
            ...common,
            type: "estero" as const,
            customerName,
            countryCode,
            taxId,
          };

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, customer }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Errore invio fattura");
        return;
      }
      setEmailSent(data.emailSent === true);
      setStatus("sent");
    } catch {
      setStatus("error");
      setError("Connessione assente — riprova.");
    }
  };

  if (status === "sent") {
    return (
      <p className="text-sm font-medium text-success sm:col-span-2">
        Fattura trasmessa al Sistema di Interscambio.
        {emailSent ? " La copia è stata inviata anche via email." : " Il recapito fiscale resta attivo anche se la copia email non è partita."}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-12 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground"
      >
        Richiedi fattura
      </button>
    );
  }

  const fieldClass = "min-h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const labelClass = "mb-1.5 block text-sm font-medium";

  return (
    <form onSubmit={onSubmit} className="space-y-5 sm:col-span-2">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Intestatario</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-background p-1">
          {([
            ["privato", "Privato"],
            ["azienda", "Azienda"],
            ["estero", "Estero"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              aria-pressed={type === value}
              className={`min-h-10 rounded-md px-2 text-sm font-medium transition-colors ${type === value ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {type === "privato" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Nome</span>
            <input required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>Cognome</span>
            <input required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldClass} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Codice fiscale</span>
            <input required minLength={16} maxLength={16} value={fiscalCode} onChange={(e) => setFiscalCode(e.target.value.toUpperCase())} className={fieldClass} />
          </label>
        </div>
      ) : type === "azienda" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>Ragione sociale</span>
            <input required autoComplete="organization" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>Partita IVA</span>
            <input required inputMode="numeric" minLength={11} maxLength={13} value={vatNumber} onChange={(e) => setVatNumber(e.target.value.toUpperCase())} className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>Codice destinatario</span>
            <input maxLength={7} placeholder="7 caratteri" value={sdiCode} onChange={(e) => setSdiCode(e.target.value.toUpperCase())} className={fieldClass} />
          </label>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>Nome o ragione sociale</span>
            <input required autoComplete="organization" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>Paese (codice ISO)</span>
            <input required minLength={2} maxLength={2} placeholder="FR" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>Identificativo fiscale estero</span>
            <input required maxLength={28} value={taxId} onChange={(e) => setTaxId(e.target.value)} className={fieldClass} />
          </label>
        </div>
      )}

      <fieldset className="grid gap-4 border-t border-border pt-5 sm:grid-cols-6">
        <legend className="px-1 text-sm font-semibold">Sede di fatturazione</legend>
        <label className="sm:col-span-6">
          <span className={labelClass}>Indirizzo</span>
          <input required autoComplete="street-address" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} className={fieldClass} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>{type === "estero" ? "Codice postale" : "CAP"}</span>
          <input required inputMode={type === "estero" ? "text" : "numeric"} maxLength={type === "estero" ? 12 : 5} autoComplete="postal-code" value={addressZip} onChange={(e) => setAddressZip(e.target.value)} className={fieldClass} />
        </label>
        <label className={type === "estero" ? "sm:col-span-4" : "sm:col-span-3"}>
          <span className={labelClass}>Città</span>
          <input required autoComplete="address-level2" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} className={fieldClass} />
        </label>
        {type !== "estero" && (
          <label className="sm:col-span-1">
            <span className={labelClass}>Prov.</span>
            <input required minLength={2} maxLength={2} autoComplete="address-level1" value={addressProvince} onChange={(e) => setAddressProvince(e.target.value.toUpperCase())} className={fieldClass} />
          </label>
        )}
      </fieldset>

      <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <label className={type === "estero" ? "sm:col-span-2" : ""}>
          <span className={labelClass}>Email per la copia</span>
          <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        </label>
        {type !== "estero" && (
          <label>
            <span className={labelClass}>PEC {type === "azienda" ? "(alternativa al codice destinatario)" : "(facoltativa)"}</span>
            <input type="email" inputMode="email" value={pec} onChange={(e) => setPec(e.target.value)} className={fieldClass} />
          </label>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-muted">
        I dati saranno usati per emettere e recapitare la fattura elettronica.{" "}
        <a href={privacyHref} className="underline">
          Informativa privacy
        </a>
        .
      </p>
      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-12 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
      >
        {status === "sending" ? "Invio..." : "Invia richiesta fattura"}
      </button>
    </form>
  );
}

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    setSubmitting(false);

    if (confirmError) {
      setError(confirmError.message ?? "Pagamento non riuscito");
      return;
    }
    onSuccess();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <PaymentElement />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="min-h-12 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
      >
        {submitting ? "Elaborazione..." : "Conferma pagamento"}
      </button>
    </form>
  );
}
