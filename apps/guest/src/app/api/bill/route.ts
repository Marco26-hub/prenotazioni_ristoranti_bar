import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";
import {
  outstandingBalanceCents,
  unpaidItems,
  supplementiCents,
  formulaCents,
} from "@/lib/balance";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId mancante" }, { status: 400 });
  }

  /*
   * Il limite è per sessione, non per solo indirizzo.
   *
   * Il conto si aggiorna ogni cinque secondi, cioè dodici volte al minuto per
   * telefono: cinque commensali allo stesso tavolo, dietro lo stesso wifi,
   * arrivavano esatti a sessanta e il sesto veniva respinto — e il suo conto
   * si fermava sull'ultimo importo buono senza dirglielo. Contato per
   * sessione il tetto è più alto di quanto un tavolo possa consumare, e
   * l'abuso da fermare, qualcuno che martella una sessione, resta fermato.
   */
  const { allowed } = await checkRateLimit(
    clientKey(request, `bill:${sessionId.slice(0, 60)}`),
    180,
    60
  );
  if (!allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
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

  const [balanceCents, items, extra, formula, incassato] = await Promise.all([
    outstandingBalanceCents(session.id),
    unpaidItems(session.id),
    supplementiCents(session.id),
    formulaCents(session.id),
    // Quanto e' gia entrato. Senza questo il cliente non puo distinguere un
    // tavolo saldato da un tavolo che non ha ancora ordinato niente: hanno
    // entrambi saldo zero.
    sql<{ tot: string | null }[]>`
      select sum(amount_cents) as tot from payments
       where table_session_id = ${session.id} and status = 'succeeded'`,
  ]);

  const paidCents = Number(incassato[0]?.tot ?? 0);

  return NextResponse.json({
    balanceCents,
    paidCents,
    currency: venue?.currency ?? "EUR",
    stripeAccountId: venue?.stripe_account_id ?? null,
    satispayEnabled: Boolean(venue?.satispay_key_id),
    tipsEnabled: venue?.tips_enabled ?? false,
    tipPercents: venue?.tip_percents ?? [5, 10, 15],
    googleReviewUrl: venue?.google_review_url ?? null,
    sessionStatus: session.status,
    unpaidItems: items,
    // Il cliente deve vedere da dove viene il totale: un conto che non torna
    // con la somma dei piatti è il primo motivo per chiamare il cameriere.
    coperto:
      extra.copertoTotaleCents > 0
        ? {
            etichetta: extra.etichettaCoperto,
            coperti: extra.coperti,
            unitarioCents: extra.copertoUnitarioCents,
            totaleCents: extra.copertoTotaleCents,
          }
        : null,
    servizio:
      extra.servizioCents > 0
        ? { percent: extra.servizioPercent, totaleCents: extra.servizioCents }
        : null,
    // A formula il totale non torna con la somma dei piatti, ed è giusto
    // così: va detto da dove viene, o il primo gesto è chiamare il cameriere.
    formula: formula.attiva
      ? {
          fascia: formula.fascia,
          prezzoUnitarioCents: formula.prezzoUnitarioCents,
          adulti: formula.adulti,
          bambini: formula.bambini,
          prezzoBambinoCents: formula.prezzoBambinoCents,
          supplementoCents: formula.supplementoCents,
          totaleCents: formula.totaleCents,
        }
      : null,
  });
}
