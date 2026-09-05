import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@repo/shared/db";
import { stripeClient } from "@/lib/stripe";

/**
 * Webhook degli abbonamenti alla piattaforma.
 *
 * Endpoint distinto da quello Connect dell'app guest: là arrivano i pagamenti
 * che i clienti fanno ai locali, qui i pagamenti che i locali fanno a noi.
 * Condividono l'account Stripe ma non il signing secret, e mescolarli
 * significherebbe far fallire la verifica della firma su metà degli eventi.
 */
const HANDLED = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 500 });
  }

  const rawBody = await request.text();
  const stripe = stripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Firma non valida: ${err instanceof Error ? err.message : "errore"}` },
      { status: 400 }
    );
  }

  if (!HANDLED.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const sub = event.data.object as Stripe.Subscription;
  const venueId = sub.metadata?.venue_id;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Il metadata è la via principale, il customer il ripiego: se qualcuno
  // crea un abbonamento dalla dashboard Stripe a mano il metadata non c'è,
  // ma il Customer resta quello che abbiamo salvato noi.
  const sql = db();
  const [venue] = venueId
    ? await sql<{ id: string }[]>`select id from venues where id = ${venueId}`
    : await sql<{ id: string }[]>`
        select id from venues where billing_customer_id = ${customerId}`;

  if (!venue) {
    console.error(
      `[billing-webhook] ${event.type} senza locale corrispondente ` +
        `(venue_id=${venueId ?? "assente"}, customer=${customerId})`
    );
    // 200: se il locale non esiste più, ritentare non lo farà comparire e
    // l'evento resterebbe in coda su Stripe per giorni.
    return NextResponse.json({ received: true, unmatched: true });
  }

  const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;

  // Stripe ha spostato `current_period_end` dall'abbonamento alle sue voci.
  // I tipi installati sono ancora quelli vecchi mentre l'account può servire
  // una API più recente, quindi si guarda in entrambi i posti: leggerne uno
  // solo lascerebbe la data di rinnovo vuota senza alcun errore visibile.
  const asRecord = sub as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const periodEndUnix =
    asRecord.current_period_end ?? asRecord.items?.data?.[0]?.current_period_end;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

  const eventAt = new Date(event.created * 1000);

  // I moduli stanno nei metadata del Price, non del codice: cambiare il
  // listino su Stripe non deve richiedere un deploy. Il metadata della
  /*
   * Si cerca fra tutte le voci, non solo la prima.
   *
   * L'abbonamento può portare accanto al piano la voce una tantum di
   * attivazione, che di moduli non ne dà e giustamente non ha il metadata.
   * Stripe non garantisce l'ordine delle voci: leggendo solo la prima, un
   * abbonamento in cui l'attivazione capitava per prima risultava senza
   * moduli — il locale paga il piano e non gli si accende niente.
   *
   * Il metadata sulla Subscription resta come ripiego per gli abbonamenti
   * creati a mano dal cruscotto.
   */
  const voci = (sub.items?.data ?? []) as Array<{
    price?: { metadata?: Record<string, string> };
  }>;
  const dalListino = voci
    .map((v) => v.price?.metadata?.moduli)
    .find((m) => typeof m === "string" && m.trim() !== "");

  const moduliGrezzi = dalListino ?? sub.metadata?.moduli ?? "";
  const moduli = moduliGrezzi
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m === "ordini" || m === "prenotazioni");

  // Un abbonamento chiuso non dà accesso a nulla: azzerare qui evita di
  // dover ricordare altrove che 'canceled' vale come nessun modulo.
  let moduliFinali: string[] | null = status === "canceled" ? [] : moduli;

  /*
   * Metadata assente non vuol dire "nessun modulo".
   *
   * Se il Price su Stripe non porta `moduli` — un listino nuovo creato in
   * fretta, un campo dimenticato — la lista risultava vuota e il locale si
   * ritrovava l'abbonamento "Attivo" con niente attivo: paga, e al primo
   * cliente che inquadra il QR legge che l'ordine al tavolo non è
   * disponibile. Nessun errore da nessuna parte, perché formalmente è tutto
   * a posto.
   *
   * In quel caso i moduli restano quelli che c'erano, e l'anomalia va nei
   * log: è una configurazione da correggere su Stripe, non una scelta del
   * cliente. Una disdetta vera passa da `canceled`, che sopra azzera davvero.
   */
  if (moduliFinali.length === 0 && status !== "canceled" && !moduliGrezzi.trim()) {
    console.error(
      `[billing] Price ${sub.items?.data?.[0]?.price?.id ?? "?"} senza metadata "moduli": ` +
        `moduli lasciati invariati per la subscription ${sub.id}. Va corretto su Stripe.`
    );
    moduliFinali = null;
  }

  // Stripe non garantisce l'ordine di consegna. Senza questo confronto un
  // "updated" consegnato in ritardo potrebbe sovrascrivere il "deleted" che
  // lo segue e riattivare un abbonamento disdetto.
  await sql`
    update venues set
      subscription_id = ${sub.id},
      subscription_status = ${status},
      subscription_plan = ${sub.metadata?.plan ?? null},
      -- null: la configurazione su Stripe è incompleta e i moduli restano
      -- quelli che c'erano. Azzerarli spegnerebbe un locale che ha pagato.
      modules = ${moduliFinali === null ? sql`modules` : moduliFinali},
      subscription_period_end = ${periodEnd},
      subscription_updated_at = ${eventAt},
      billing_customer_id = coalesce(billing_customer_id, ${customerId})
    where id = ${venue.id}
      and (subscription_updated_at is null or subscription_updated_at <= ${eventAt})`;

  return NextResponse.json({ received: true });
}
