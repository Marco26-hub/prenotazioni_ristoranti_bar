import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { stripeClient } from "@/lib/stripe";

/**
 * Onboarding Stripe Connect Express per il locale. Non gestiamo noi i dati
 * bancari/KYC: creiamo l'account e mandiamo il gestore sulla pagina Stripe
 * hosted per completarlo — obbligo normativo che solo il titolare reale
 * dell'attività può soddisfare.
 */
export async function POST() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) {
    return NextResponse.json({ error: "Nessun locale associato" }, { status: 403 });
  }

  const sql = db();
  const [venueRow] = await sql<
    { id: string; stripe_account_id: string | null }[]
  >`select id, stripe_account_id from venues where id = ${venue.venueId}`;

  if (!venueRow) {
    return NextResponse.json({ error: "Locale non trovato" }, { status: 404 });
  }

  const stripe = stripeClient();
  let accountId = venueRow.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "IT",
      email: session!.user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;
    await sql`update venues set stripe_account_id = ${accountId} where id = ${venueRow.id}`;
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3011";
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/dashboard/settings`,
    return_url: `${appUrl}/dashboard/settings`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
