"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useRitmo } from "@repo/shared/ritmo";
import { useLingua } from "@repo/shared/i18n/contesto";
import type { Formula } from "@/lib/balance";
import { tComune } from "@repo/shared/i18n/comune";
import { tConto } from "@/i18n/conto";

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
  /*
   * Il tipo viene da `Formula`, non riscritto a mano.
   *
   * Riscritto, restava indietro senza che niente lo dicesse: la rotta
   * mandava un campo, la pagina non sapeva di averlo, e il conto mostrava
   * il totale sbagliato in silenzio.
   */
  formula: Formula | null;
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
  const lingua = useLingua();
  const t = tConto(lingua);
  const tc = tComune(lingua);
  const [bill, setBill] = useState<BillState | null>(null);
  // L'ultimo aggiornamento non è riuscito: l'importo a schermo può non
  // essere più quello vero.
  const [fermo, setFermo] = useState(false);
  /*
   * Gli importi dell'ultimo giro, per accorgersi che sono cambiati.
   *
   * In un ref e non nello stato: servono solo a decidere se rimettere
   * svelto il ritmo, e metterli nello stato rifarebbe il render della
   * pagina a ogni giro per due numeri che si mostrano già da soli.
   */
  const ultimiImporti = useRef<{ saldo: number; pagato: number } | null>(null);
  /*
   * Il ritmo si definisce sotto, ma serve qui dentro: senza il ref si
   * rincorrerebbero a vicenda.
   */
  const rimettiSvelto = useRef<() => void>(() => {});
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
      if (!res.ok) setError(data.error ?? t("errore.chiamata"));
      else setChiamato(data.messaggio);
    } catch {
      setError(t("errore.chiamata.rete"));
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
    /*
     * Cambiato qualcosa, si torna a chiedere spesso.
     *
     * Il ritmo rallenta a venti secondi dopo mezzo minuto di giri identici,
     * ed è giusto: un tavolo che aspetta non ha bisogno di dodici richieste
     * al minuto. Ma senza questo non tornava più svelto per il resto della
     * serata, e l'ondata appena mandata si vedeva sul conto venti secondi
     * dopo — è la cifra su cui il tavolo decide se ordinare ancora.
     */
    const precedenti = ultimiImporti.current;
    if (
      precedenti === null ||
      precedenti.saldo !== data.balanceCents ||
      precedenti.pagato !== data.paidCents
    ) {
      rimettiSvelto.current();
    }
    ultimiImporti.current = {
      saldo: data.balanceCents,
      pagato: data.paidCents,
    };
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
  const ritmoSvelto = useRitmo(refreshBill, {
    svelto: 5000,
    lento: 20000,
    attivo: !paid,
  });

  // Il ponte si monta fuori dal render: `refreshBill` è definita prima del
  // ritmo, ma deve poterlo rimettere svelto.
  useEffect(() => {
    rimettiSvelto.current = ritmoSvelto;
  }, [ritmoSvelto]);

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
        setError(data.error ?? t("errore.pagamento"));
        return;
      }
      setClientSecret(data.clientSecret);
    } catch {
      setError(tc("stato.errore.rete"));
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
        setError(data.error ?? t("errore.pagamento.satispay"));
        return;
      }
      // Satispay non offre un widget embeddable: il pagamento si completa
      // sulla loro pagina/app, poi torna sul redirect_url configurato.
      window.location.assign(data.redirectUrl);
    } catch {
      setError(tc("stato.errore.rete"));
    }
  };

  if (!bill) return null;

  if (paid) {
    return (
      <section className="mt-8 space-y-4 rounded-xl border border-border bg-surface p-5">
        <p className="font-medium text-success">{t("conto.saldato")}</p>

        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href={`/api/receipts/${sessionId}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center rounded-full border border-border px-5 text-center text-sm font-medium hover:bg-background focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t("conto.ricevuta")}
          </a>
          <InvoiceRequest sessionId={sessionId} privacyHref={privacyHref} />
        </div>
        <p className="text-xs text-muted">{t("conto.ricevuta.nota")}</p>

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
            {t("conto.recensione")}
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

  /*
   * A prezzo fisso, finché la sala non dice in quanti sono, il totale non
   * esiste.
   *
   * La sessione la apre chi inquadra il QR e nasce a un coperto: il numero
   * che sapremmo mostrare sarebbe quello di una persona sola per un tavolo
   * da sei. Mostrarlo, e per giunta lasciarlo pagare, vuol dire incassare
   * venticinque euro dove ce n'erano centocinquanta — e accorgersene dopo,
   * quando il tavolo se n'è andato.
   */
  const copertiDaConfermare = Boolean(bill.formula?.copertiDaConfermare);
  /*
   * Due schermate diverse, non una.
   *
   * «Non sappiamo in quanti siete» e «avete detto sei, lo stiamo
   * confermando» sono due cose diverse per chi legge. Nella seconda il
   * numero c'è: mostrare un trattino a chi ha appena risposto sembrerebbe
   * che la risposta si sia persa.
   */
  const provvisorio = Boolean(bill.formula?.copertiDalTavolo);

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">{t("conto.titolo")}</h2>
        <span className="text-xl font-semibold tabular-nums">
          {copertiDaConfermare && !provvisorio
            ? "—"
            : t.prezzo(bill.balanceCents, bill.currency)}
        </span>
      </div>

      {copertiDaConfermare && (
        <p
          role="status"
          className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {provvisorio
            ? t("conto.coperti_provvisori")
            : t("conto.coperti_da_confermare")}
        </p>
      )}

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
          {t("conto.fermo")}
        </p>
      )}

      {bill.formula && (
        <dl className="mb-4 space-y-1 rounded-lg bg-background p-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt>
              {t(`formula.${bill.formula.fascia}`)}
              {bill.formula.adulti > 0 && (
                <> · {bill.formula.adulti} × {t.prezzo(bill.formula.prezzoUnitarioCents, bill.currency)}</>
              )}
            </dt>
            <dd className="tabular-nums">
              {t.prezzo(
                bill.formula.adulti * bill.formula.prezzoUnitarioCents,
                bill.currency
              )}
            </dd>
          </div>

          {bill.formula.bambini > 0 && (
            <div className="flex justify-between gap-3">
              <dt>
                {t.n(bill.formula.bambini, "formula.bambini")}
                {bill.formula.prezzoBambinoCents !== null && (
                  <>
                    {" "}· {t.prezzo(bill.formula.prezzoBambinoCents, bill.currency)}
                  </>
                )}
              </dt>
              <dd className="tabular-nums">
                {t.prezzo(
                  bill.formula.bambini *
                    (bill.formula.prezzoBambinoCents ?? bill.formula.prezzoUnitarioCents),
                  bill.currency
                )}
              </dd>
            </div>
          )}

          {bill.formula.supplementoCents > 0 && (
            <div className="flex justify-between gap-3">
              <dt>{t("formula.supplemento")}</dt>
              <dd className="tabular-nums">
                {t.prezzo(bill.formula.supplementoCents, bill.currency)}
              </dd>
            </div>
          )}

          <p className="pt-1 text-xs text-muted">{t("formula.compresi")}</p>
        </dl>
      )}

      {!bill.stripeAccountId && !bill.satispayEnabled && (
        <p className="rounded-lg bg-background p-3 text-sm text-muted">
          {t("pagamento.non_attivo")}
        </p>
      )}

      {(bill.stripeAccountId || bill.satispayEnabled) &&
        !clientSecret &&
        !copertiDaConfermare && (
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
                  {t("pagamento.tutto")}
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode(true)}
                  className={`rounded border px-3 py-1 text-sm ${splitMode ? "bg-accent text-accent-foreground" : ""}`}
                >
                  {t("pagamento.mia_parte")}
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
                          {t.prezzo(item.totalCents, bill.currency)}
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
              <label className="mb-1 block text-sm">{t("mancia.etichetta")}</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTipCents(0)}
                  className={`min-h-10 rounded-full border border-border px-4 text-sm ${
                    tipCents === 0 ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  {t("mancia.nessuna")}
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
                        {t.prezzo(cents, bill.currency)}
                      </span>
                      {suggested && (
                        <span className="ml-1 text-xs">{t("mancia.suggerita")}</span>
                      )}
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
              {t("pagamento.carta", {
                importo: t.prezzo(payableCents + tipCents, bill.currency),
              })}
            </button>
          )}

          {bill.satispayEnabled && splitMode && (
            <p className="text-xs text-muted">
              {t("pagamento.satispay.intero")}
            </p>
          )}

          {bill.satispayEnabled && !splitMode && (
            <button
              type="button"
              onClick={startSatispayCheckout}
              className="min-h-12 w-full rounded-full border border-border font-medium active:scale-95"
            >
              {t("pagamento.satispay", {
                importo: t.prezzo(bill.balanceCents + tipCents, bill.currency),
              })}
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
          {t("contanti.paga")}
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
          <p className="font-medium">{t("contanti.titolo")}</p>
          <fieldset>
            <legend className="mb-2 text-sm text-muted">
              {t("contanti.documento")}
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
              {d === "scontrino" ? t("contanti.scontrino") : t("contanti.fattura")}
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
        {chiamando ? t("contanti.chiamo") : t("contanti.chiama")}
          </button>
          <button
            type="button"
            onClick={() => setContanti(false)}
            className="min-h-11 w-full text-sm underline underline-offset-4"
          >
            {t("contanti.torna")}
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
  const lingua = useLingua();
  const t = tConto(lingua);
  const tc = tComune(lingua);
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
        setError(data.error ?? t("errore.fattura"));
        return;
      }
      setEmailSent(data.emailSent === true);
      setStatus("sent");
    } catch {
      setStatus("error");
      setError(tc("stato.errore.rete"));
    }
  };

  if (status === "sent") {
    return (
      <p className="text-sm font-medium text-success sm:col-span-2">
        {t("fattura.inviata")}
        {emailSent ? t("fattura.inviata.email") : t("fattura.inviata.email_no")}
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
        {t("fattura.richiedi")}
      </button>
    );
  }

  const fieldClass = "min-h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const labelClass = "mb-1.5 block text-sm font-medium";

  return (
    <form onSubmit={onSubmit} className="space-y-5 sm:col-span-2">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("fattura.intestatario")}</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-background p-1">
          {([
            ["privato", "fattura.privato"],
            ["azienda", "fattura.azienda"],
            ["estero", "fattura.estero"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              aria-pressed={type === value}
              className={`min-h-10 rounded-md px-2 text-sm font-medium transition-colors ${type === value ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface"}`}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </fieldset>

      {type === "privato" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>{t("campo.nome")}</span>
            <input required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>{t("campo.cognome")}</span>
            <input required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldClass} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>{t("campo.codice_fiscale")}</span>
            <input required minLength={16} maxLength={16} value={fiscalCode} onChange={(e) => setFiscalCode(e.target.value.toUpperCase())} className={fieldClass} />
          </label>
        </div>
      ) : type === "azienda" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>{t("campo.ragione_sociale")}</span>
            <input required autoComplete="organization" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>{t("campo.partita_iva")}</span>
            <input required inputMode="numeric" minLength={11} maxLength={13} value={vatNumber} onChange={(e) => setVatNumber(e.target.value.toUpperCase())} className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>{t("campo.codice_destinatario")}</span>
            <input maxLength={7} placeholder={t("campo.codice_destinatario.esempio")} value={sdiCode} onChange={(e) => setSdiCode(e.target.value.toUpperCase())} className={fieldClass} />
          </label>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>{t("campo.nome_o_ragione_sociale")}</span>
            <input required autoComplete="organization" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>{t("campo.paese")}</span>
            <input required minLength={2} maxLength={2} placeholder="FR" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} className={fieldClass} />
          </label>
          <label>
            <span className={labelClass}>{t("campo.identificativo_estero")}</span>
            <input required maxLength={28} value={taxId} onChange={(e) => setTaxId(e.target.value)} className={fieldClass} />
          </label>
        </div>
      )}

      <fieldset className="grid gap-4 border-t border-border pt-5 sm:grid-cols-6">
        <legend className="px-1 text-sm font-semibold">{t("fattura.sede")}</legend>
        <label className="sm:col-span-6">
          <span className={labelClass}>{t("campo.indirizzo")}</span>
          <input required autoComplete="street-address" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} className={fieldClass} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>
            {type === "estero" ? t("campo.codice_postale") : t("campo.cap")}
          </span>
          <input required inputMode={type === "estero" ? "text" : "numeric"} maxLength={type === "estero" ? 12 : 5} autoComplete="postal-code" value={addressZip} onChange={(e) => setAddressZip(e.target.value)} className={fieldClass} />
        </label>
        <label className={type === "estero" ? "sm:col-span-4" : "sm:col-span-3"}>
          <span className={labelClass}>{t("campo.citta")}</span>
          <input required autoComplete="address-level2" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} className={fieldClass} />
        </label>
        {type !== "estero" && (
          <label className="sm:col-span-1">
            <span className={labelClass}>{t("campo.provincia")}</span>
            <input required minLength={2} maxLength={2} autoComplete="address-level1" value={addressProvince} onChange={(e) => setAddressProvince(e.target.value.toUpperCase())} className={fieldClass} />
          </label>
        )}
      </fieldset>

      <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <label className={type === "estero" ? "sm:col-span-2" : ""}>
          <span className={labelClass}>{t("campo.email_copia")}</span>
          <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        </label>
        {type !== "estero" && (
          <label>
            <span className={labelClass}>
              {type === "azienda" ? t("campo.pec.azienda") : t("campo.pec.privato")}
            </span>
            <input type="email" inputMode="email" value={pec} onChange={(e) => setPec(e.target.value)} className={fieldClass} />
          </label>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-muted">
        {t("fattura.privacy")}{" "}
        <a href={privacyHref} className="underline">
          {t("fattura.privacy.link")}
        </a>
        .
      </p>
      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-12 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
      >
        {status === "sending" ? t("fattura.invio") : t("fattura.invia")}
      </button>
    </form>
  );
}

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const t = tConto(useLingua());
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
      setError(confirmError.message ?? t("errore.pagamento.fallito"));
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
        {submitting ? t("pagamento.elaborazione") : t("pagamento.conferma")}
      </button>
    </form>
  );
}
