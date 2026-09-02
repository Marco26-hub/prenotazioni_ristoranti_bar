import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientIp } from "@repo/shared/rate-limit";
import { outstandingBalanceCents } from "@/lib/balance";

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
    { stripe_account_id: string | null; currency: string }[]
  >`select stripe_account_id, currency from venues where id = ${session.venue_id}`;

  const balanceCents = await outstandingBalanceCents(session.id);

  return NextResponse.json({
    balanceCents,
    currency: venue?.currency ?? "EUR",
    stripeAccountId: venue?.stripe_account_id ?? null,
    sessionStatus: session.status,
  });
}
