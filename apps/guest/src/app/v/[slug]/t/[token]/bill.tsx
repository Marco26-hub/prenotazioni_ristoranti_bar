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

interface UnpaidItem {
  id: string;
  name: string;
  quantity: number;
  totalCents: number;
}

interface BillState {
  balanceCents: number;
  currency: string;
  stripeAccountId: string | null;
  satispayEnabled: boolean;
  tipsEnabled: boolean;
  tipPercents: number[];
  googleReviewUrl: string | null;
  unpaidItems: UnpaidItem[];
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

export function Bill({ sessionId, privacyHref }: { sessionId: string; privacyHref: string }) {
  const [bill, setBill] = useState<BillState | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [tipCents, setTipCents] = useState(0);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const refreshBill = useCallback(async () => {
    const res = await fetch(`/api/bill?sessionId=${sessionId}`);
    if (!res.ok) return;
    const data = (await res.json()) as BillState & { sessionStatus: string };
    setBill(data);
    if (data.sessionStatus === "closed") setPaid(true);
  }, [sessionId]);

  useEffect(() => {
    // Il setState avviene dentro il fetch async (dopo l'await), non
    // sincrono nel corpo dell'effect — pattern standard fetch-on-mount,
    // la regola set-state-in-effect qui è un falso positivo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshBill();
    // Polling semplice: più ospiti allo stesso tavolo possono ordinare in
    // parallelo, il conto deve riflettere gli ordini altrui senza reload manuale.
    const interval = setInterval(refreshBill, 5000);
    return () => clearInterval(interval);
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

        <InvoiceRequest sessionId={sessionId} privacyHref={privacyHref} />
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

      {!bill.stripeAccountId && !bill.satispayEnabled && (
        <p className="rounded-lg bg-background p-3 text-sm text-muted">
          Pagamento online non ancora attivo per questo locale — chiedi al personale.
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

      {bill.stripeAccountId && clientSecret && (
        <CheckoutForm
          accountId={bill.stripeAccountId}
          clientSecret={clientSecret}
          onSuccess={() => {
            setPaid(true);
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
  const [type, setType] = useState<"privato" | "azienda">("privato");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const customer =
      type === "privato"
        ? { type: "privato" as const, firstName, lastName, fiscalCode }
        : { type: "azienda" as const, companyName, vatNumber };

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
      setStatus("sent");
    } catch {
      setStatus("error");
      setError("Connessione assente — riprova.");
    }
  };

  if (status === "sent") {
    return <p className="text-sm text-success">Fattura inviata al Sistema di Interscambio.</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm underline">
        Richiedi fattura
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("privato")}
          className={`rounded border px-3 py-1 text-sm ${type === "privato" ? "bg-black text-white" : ""}`}
        >
          Privato
        </button>
        <button
          type="button"
          onClick={() => setType("azienda")}
          className={`rounded border px-3 py-1 text-sm ${type === "azienda" ? "bg-black text-white" : ""}`}
        >
          Azienda
        </button>
      </div>

      {type === "privato" ? (
        <>
          <input
            placeholder="Nome"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-border bg-background px-3"
          />
          <input
            placeholder="Cognome"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-border bg-background px-3"
          />
          <input
            placeholder="Codice fiscale"
            required
            value={fiscalCode}
            onChange={(e) => setFiscalCode(e.target.value.toUpperCase())}
            className="min-h-12 w-full rounded-lg border border-border bg-background px-3"
          />
        </>
      ) : (
        <>
          <input
            placeholder="Ragione sociale"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-border bg-background px-3"
          />
          <input
            placeholder="Partita IVA"
            required
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-border bg-background px-3"
          />
        </>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-muted">
        I dati inseriti sono usati per emettere la fattura e trasmetterla al
        Sistema di Interscambio.{" "}
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
