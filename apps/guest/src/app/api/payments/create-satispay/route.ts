import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { contoSessione } from "@repo/shared/conto";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";
import { createSatispayPayment, getSatispayPayment } from "@repo/shared/satispay";
import { decryptSecret } from "@repo/shared/crypto";
import { hasModulo } from "@repo/shared";
import { outstandingBalanceCents } from "@/lib/balance";
import { tApi, linguaRichiesta } from "@/i18n/api";

interface CreateSatispayBody {
  sessionId: string;
  tipCents?: number;
}

export async function POST(request: Request) {
  const t = tApi(linguaRichiesta(request));

  const { allowed } = await checkRateLimit(clientKey(request, "create-satispay"), 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: t("errore.troppe_richieste_riprova") }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as CreateSatispayBody | null;
  if (!body?.sessionId) {
    return NextResponse.json({ error: t("errore.sessione_id_mancante") }, { status: 400 });
  }
  const tipCents = Number.isInteger(body.tipCents) ? Math.max(body.tipCents!, 0) : 0;

  const sql = db();

  const [session] = await sql<
    { id: string; venue_id: string; status: string; venue_slug: string; qr_token: string }[]
  >`
    select ts.id, ts.venue_id, ts.status, v.slug as venue_slug, t.qr_token
    from table_sessions ts
    join venues v on v.id = ts.venue_id
    join tables t on t.id = ts.table_id
    where ts.id = ${body.sessionId}`;

  if (!session || session.status !== "open") {
    return NextResponse.json({ error: t("errore.sessione_tavolo_non_valida") }, { status: 404 });
  }

  /*
   * A prezzo fisso non si incassa finché la sala non dice in quanti sono.
   *
   * Il bottone a schermo è già sparito, ma questa rotta è un POST pubblico
   * come tutte le altre: chi la chiama a mano pagherebbe il conto di una
   * persona sola per un tavolo da sei, e la differenza non tornerebbe più.
   * Il controllo dev'essere qui, non solo in pagina.
   */
  const contoAdesso = await contoSessione(sql, session.id);
  if (contoAdesso.copertiDaConfermare) {
    return NextResponse.json(
      { error: t("pagamento.errore.coperti_da_confermare") },
      { status: 409 }
    );
  }

  const [venue] = await sql<
    {
      satispay_key_id: string | null;
      satispay_private_key: string | null;
      subscription_status: string;
      subscription_period_end: Date | null;
      modules: string[] | null;
    }[]
  >`select satispay_key_id, satispay_private_key, subscription_status,
           subscription_period_end, modules
      from venues where id = ${session.venue_id}`;

  // Stesso controllo di create-intent: senza, un locale con abbonamento
  // scaduto non poteva più incassare con carta ma continuava a incassare
  // con Satispay, e il paywall valeva solo per metà dei pagamenti.
  if (
    !hasModulo(
      "ordini",
      venue?.subscription_status,
      venue?.subscription_period_end,
      venue?.modules
    )
  ) {
    return NextResponse.json(
      { error: t("pagamento.errore.non_attivo") },
      { status: 402 }
    );
  }

  if (!venue?.satispay_key_id || !venue.satispay_private_key) {
    return NextResponse.json(
      { error: t("pagamento.errore.satispay_non_abilitato") },
      { status: 409 }
    );
  }
  const satispayPrivateKey = decryptSecret(venue.satispay_private_key);

  const origin = new URL(request.url).origin;
  const returnUrl = `${origin}/v/${session.venue_slug}/t/${session.qr_token}`;

  const [existingPending] = await sql<
    { id: string; provider: string; provider_payment_id: string }[]
  >`select id, provider, provider_payment_id from payments
    where table_session_id = ${session.id} and status = 'pending'`;

  if (existingPending) {
    if (existingPending.provider !== "satispay") {
      return NextResponse.json(
        { error: t("pagamento.errore.altro_metodo") },
        { status: 409 }
      );
    }

    const status = await getSatispayPayment(
      existingPending.provider_payment_id,
      venue.satispay_key_id,
      satispayPrivateKey
    );

    if (status.status === "PENDING" || status.status === "AUTHORIZED") {
      return NextResponse.json({ redirectUrl: status.redirect_url });
    }
    if (status.status === "ACCEPTED") {
      return NextResponse.json({ error: t("pagamento.errore.gia_pagato") }, { status: 409 });
    }
    await sql`update payments set status = 'failed' where id = ${existingPending.id}`;
  }

  const balanceCents = await outstandingBalanceCents(session.id);
  const amountCents = balanceCents + tipCents;
  if (amountCents <= 0) {
    return NextResponse.json({ error: t("pagamento.errore.nessun_importo") }, { status: 409 });
  }

  const payment = await createSatispayPayment({
    keyId: venue.satispay_key_id,
    privateKeyPem: satispayPrivateKey,
    amountCents,
    externalCode: session.id,
    callbackUrl: `${origin}/api/webhooks/satispay?payment_id={uuid}&venue_id=${session.venue_id}`,
    redirectUrl: returnUrl,
  });

  try {
    await sql`
      insert into payments (
        venue_id, table_session_id, amount_cents, tip_cents,
        method, provider, provider_payment_id, split_type, status
      ) values (
        ${session.venue_id}, ${session.id}, ${balanceCents}, ${tipCents},
        'satispay', 'satispay', ${payment.id}, 'full', 'pending'
      )`;
  } catch (err) {
    const isUniqueViolation = err instanceof Error && "code" in err && err.code === "23505";
    if (!isUniqueViolation) throw err;
    // Un'altra richiesta ha vinto la corsa: il pagamento Satispay appena
    // creato resta semplicemente inutilizzato e scade da solo lato Satispay.
    const [winner] = await sql<{ provider_payment_id: string }[]>`
      select provider_payment_id from payments
      where table_session_id = ${session.id} and status = 'pending'`;
    const winnerStatus = await getSatispayPayment(
      winner.provider_payment_id,
      venue.satispay_key_id,
      satispayPrivateKey
    );
    return NextResponse.json({ redirectUrl: winnerStatus.redirect_url });
  }

  return NextResponse.json({ redirectUrl: payment.redirect_url });
}
