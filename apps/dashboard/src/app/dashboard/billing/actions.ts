"use server";

import { db } from "@repo/shared/db";
import { planByKey, TRIAL_DAYS } from "@repo/shared/plans";
import { requireRole } from "@/lib/authz";
import { stripeClient } from "@/lib/stripe";

export interface BillingResult {
  url?: string;
  error?: string;
}

/**
 * Il Price sta su Stripe, non nel codice: cambiare listino non deve
 * richiedere un deploy, e soprattutto il prezzo addebitato non deve poter
 * divergere da quello configurato nell'account.
 */
function priceIdFor(planKey: string): string | null {
  const env =
    planKey === "annuale"
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;
  return env && env.startsWith("price_") ? env : null;
}

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3011";
}

/**
 * Riusa il Customer già collegato al locale invece di crearne uno nuovo a
 * ogni tentativo: due Customer per lo stesso locale significano storico
 * fatture spezzato in due e un portale che ne mostra solo metà.
 */
async function customerIdFor(venueId: string, venueName: string, email: string) {
  const sql = db();
  const [row] = await sql<{ billing_customer_id: string | null }[]>`
    select billing_customer_id from venues where id = ${venueId}`;
  if (row?.billing_customer_id) return row.billing_customer_id;

  const customer = await stripeClient().customers.create({
    name: venueName,
    email,
    metadata: { venue_id: venueId },
  });

  await sql`update venues set billing_customer_id = ${customer.id} where id = ${venueId}`;
  return customer.id;
}

export async function startSubscription(planKey: string): Promise<BillingResult> {
  // Solo il titolare: l'abbonamento è un impegno di spesa ricorrente
  // sull'attività, non una preferenza operativa.
  const { venue, userId } = await requireRole(["owner"]);

  const plan = planByKey(planKey);
  if (!plan) return { error: "Piano non valido" };

  const priceId = priceIdFor(plan.key);
  if (!priceId) {
    return {
      error:
        "Listino non ancora configurato. Servono le variabili STRIPE_PRICE_MONTHLY e STRIPE_PRICE_YEARLY.",
    };
  }

  const sql = db();
  const [user] = await sql<{ email: string }[]>`
    select email from users where id = ${userId}`;

  const [existing] = await sql<{ subscription_status: string }[]>`
    select subscription_status from venues where id = ${venue.venueId}`;

  try {
    const customerId = await customerIdFor(
      venue.venueId,
      venue.venueName,
      user?.email ?? ""
    );

    // La prova gratuita spetta una volta sola: chi ha già avuto un
    // abbonamento non deve poterla riottenere disdicendo e risottoscrivendo.
    const neverSubscribed = (existing?.subscription_status ?? "none") === "none";

    const session = await stripeClient().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Senza questi metadata il webhook non saprebbe quale locale attivare.
      subscription_data: {
        metadata: { venue_id: venue.venueId, plan: plan.key },
        ...(neverSubscribed ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      metadata: { venue_id: venue.venueId, plan: plan.key },
      locale: "it",
      allow_promotion_codes: true,
      // Il locale è un'impresa: la partita IVA serve in fattura e per
      // l'inversione contabile sulle vendite intracomunitarie.
      tax_id_collection: { enabled: true },
      billing_address_collection: "required",
      success_url: `${appUrl()}/dashboard/billing?ok=1`,
      cancel_url: `${appUrl()}/dashboard/billing`,
    });

    if (!session.url) return { error: "Stripe non ha restituito un link di pagamento" };
    return { url: session.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore imprevisto su Stripe" };
  }
}

/**
 * Portale di fatturazione di Stripe: cambio carta, storico fatture, disdetta.
 * Ricostruirlo in casa significherebbe gestire dati di pagamento e note di
 * credito senza guadagnarci nulla.
 */
export async function openBillingPortal(): Promise<BillingResult> {
  const { venue } = await requireRole(["owner"]);
  const sql = db();

  const [row] = await sql<{ billing_customer_id: string | null }[]>`
    select billing_customer_id from venues where id = ${venue.venueId}`;

  if (!row?.billing_customer_id) {
    return { error: "Nessun abbonamento da gestire" };
  }

  try {
    const session = await stripeClient().billingPortal.sessions.create({
      customer: row.billing_customer_id,
      return_url: `${appUrl()}/dashboard/billing`,
      locale: "it",
    });
    return { url: session.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore imprevisto su Stripe" };
  }
}
