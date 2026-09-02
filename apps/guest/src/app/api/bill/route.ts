import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientIp } from "@repo/shared/rate-limit";
import { outstandingBalanceCents, unpaidItems } from "@/lib/balance";

export async function GET(request: Request) {
  const { allowed } = await checkRateLimit(`bill:${clientIp(request)}`, 60, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId mancante" }, { status: 400 });
  }

  const sql = db();
  const [session] = await sql<{ id: string; venue_id: string; status: string }[]>`
    select id, venue_id, status from table_sessions where id = ${sessionId}`;

  if (!session) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 404 });
  }

  const [venue] = await sql<
    {
      stripe_account_id: string | null;
      satispay_key_id: string | null;
      currency: string;
      tips_enabled: boolean;
      tip_percents: number[] | null;
      google_review_url: string | null;
    }[]
  >`select stripe_account_id, satispay_key_id, currency,
           tips_enabled, tip_percents, google_review_url
    from venues where id = ${session.venue_id}`;

  const [balanceCents, items] = await Promise.all([
    outstandingBalanceCents(session.id),
    unpaidItems(session.id),
  ]);

  return NextResponse.json({
    balanceCents,
    currency: venue?.currency ?? "EUR",
    stripeAccountId: venue?.stripe_account_id ?? null,
    satispayEnabled: Boolean(venue?.satispay_key_id),
    tipsEnabled: venue?.tips_enabled ?? false,
    tipPercents: venue?.tip_percents ?? [5, 10, 15],
    googleReviewUrl: venue?.google_review_url ?? null,
    sessionStatus: session.status,
    unpaidItems: items,
  });
}
