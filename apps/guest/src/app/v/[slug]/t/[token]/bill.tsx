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

interface BillState {
  balanceCents: number;
  currency: string;
  stripeAccountId: string | null;
  satispayEnabled: boolean;
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

export function Bill({ sessionId }: { sessionId: string }) {
  const [bill, setBill] = useState<BillState | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [tipCents, setTipCents] = useState(0);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ sessionId, tipCents }),
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
      <section className="mt-8 rounded border p-4">
        <p className="mb-3 text-green-700">Conto saldato, grazie!</p>
        <InvoiceRequest sessionId={sessionId} />
      </section>
    );
  }

  if (bill.balanceCents <= 0) return null;

  return (
    <section className="mt-8 rounded border p-4">
      <h2 className="mb-2 text-lg font-medium">Conto</h2>
      <p className="mb-4">
        Totale: {formatPriceCents(bill.balanceCents, bill.currency)}
      </p>

      {!bill.stripeAccountId && !bill.satispayEnabled && (
        <p className="text-sm text-red-600">
          Pagamento online non ancora attivo per questo locale — chiedi al personale.
        </p>
      )}

      {(bill.stripeAccountId || bill.satispayEnabled) && !clientSecret && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">Mancia (opzionale)</label>
            <div className="flex gap-2">
              {[0, 100, 200, 500].map((cents) => (
                <button
                  key={cents}
                  type="button"
                  onClick={() => setTipCents(cents)}
                  className={`rounded border px-3 py-1 text-sm ${
                    tipCents === cents ? "bg-black text-white" : ""
                  }`}
                >
                  {cents === 0 ? "Nessuna" : formatPriceCents(cents, bill.currency)}
                </button>
              ))}
            </div>
          </div>

          {bill.stripeAccountId && (
            <button
              type="button"
              onClick={startCheckout}
              className="w-full rounded bg-black py-2 text-white"
            >
              Paga con carta — {formatPriceCents(bill.balanceCents + tipCents, bill.currency)}
            </button>
          )}

          {bill.satispayEnabled && (
            <button
              type="button"
              onClick={startSatispayCheckout}
              className="w-full rounded border border-black py-2 text-black"
            >
              Paga con Satispay — {formatPriceCents(bill.balanceCents + tipCents, bill.currency)}
            </button>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
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

function InvoiceRequest({ sessionId }: { sessionId: string }) {
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
    return <p className="text-sm text-green-700">Fattura inviata al Sistema di Interscambio.</p>;
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
            className="w-full rounded border p-2"
          />
          <input
            placeholder="Cognome"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded border p-2"
          />
          <input
            placeholder="Codice fiscale"
            required
            value={fiscalCode}
            onChange={(e) => setFiscalCode(e.target.value.toUpperCase())}
            className="w-full rounded border p-2"
          />
        </>
      ) : (
        <>
          <input
            placeholder="Ragione sociale"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded border p-2"
          />
          <input
            placeholder="Partita IVA"
            required
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            className="w-full rounded border p-2"
          />
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Elaborazione..." : "Conferma pagamento"}
      </button>
    </form>
  );
}
