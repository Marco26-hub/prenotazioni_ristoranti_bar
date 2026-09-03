import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";
import { hasModulo } from "@repo/shared";
import { messaggioErrore } from "@repo/shared/errori";
import { stripeClient } from "@/lib/stripe";
import { outstandingBalanceCents } from "@/lib/balance";

interface CreateIntentBody {
  sessionId: string;
  tipCents?: number;
  /** Se valorizzato, si paga solo questi piatti (split per piatto). */
  orderItemIds?: string[];
}


/**
 * Stripe sta dicendo che questo intent non esiste più, o non ha risposto?
 *
 * È la differenza fra archiviare la riga e restituire un errore
 * temporaneo, e senza distinguerla un blip di rete diventa un doppio
 * addebito.
 */
function intentSconosciuto(err: unknown): boolean {
  const e = err as { type?: string; code?: string; statusCode?: number };
  return (
    e?.code === "resource_missing" ||
    (e?.type === "StripeInvalidRequestError" && e?.statusCode === 404)
  );
}

export async function POST(request: Request) {
  const { allowed } = await checkRateLimit(clientKey(request, "create-intent"), 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as CreateIntentBody | null;
  if (!body?.sessionId) {
    return NextResponse.json({ error: "sessionId mancante" }, { status: 400 });
  }
  const tipCents = Number.isInteger(body.tipCents) ? Math.max(body.tipCents!, 0) : 0;

  const sql = db();
  const [session] = await sql<{ id: string; venue_id: string; status: string }[]>`
    select id, venue_id, status from table_sessions where id = ${body.sessionId}`;

  if (!session || session.status !== "open") {
    return NextResponse.json({ error: "Sessione tavolo non valida" }, { status: 404 });
  }

  const [venue] = await sql<
    {
      stripe_account_id: string | null;
      currency: string;
      subscription_status: string;
      subscription_period_end: Date | null;
      modules: string[] | null;
    }[]
  >`select stripe_account_id, currency, subscription_status, subscription_period_end,
           modules
      from venues where id = ${session.venue_id}`;

  if (
    !hasModulo(
      "ordini",
      venue?.subscription_status,
      venue?.subscription_period_end,
      venue?.modules
    )
  ) {
    return NextResponse.json(
      { error: "Pagamento dal tavolo non attivo per questo locale — chiedi al personale" },
      { status: 402 }
    );
  }

  if (!venue?.stripe_account_id) {
    return NextResponse.json(
      { error: "Locale non ancora abilitato ai pagamenti" },
      { status: 409 }
    );
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    // Il locale risulta abilitato ma la piattaforma non è configurata:
    // per il cliente al tavolo deve restare un messaggio comprensibile.
    console.error("[create-intent] STRIPE_SECRET_KEY mancante");
    return NextResponse.json(
      { error: "Pagamento online non disponibile al momento — chiedi al personale" },
      { status: 503 }
    );
  }

  const stripe = stripeClient();

  /*
   * Un tentativo abbandonato non deve bloccare il tavolo per sempre.
   *
   * Chi apre il pagamento e chiude l'app lascia una riga 'pending'. Dieci
   * minuti sono molto piu del tempo che serve a inserire una carta: oltre,
   * si considera abbandonato e lo slot torna libero.
   */
  /*
   * L'ordine conta: prima si annulla su Stripe, poi si archivia la riga.
   *
   * Al contrario — archiviare e poi annullare — un annullamento fallito per
   * un errore di passaggio lasciava la riga 'failed' con l'intent ancora
   * confermabile: il saldo tornava pieno, il tavolo poteva pagare di nuovo, e
   * il webhook non recuperava perché promuove solo le righe 'pending'. Se
   * l'annullamento non riesce la riga resta com'è e ci si riprova al giro
   * dopo: uno slot occupato qualche minuto in più è un fastidio, un doppio
   * addebito invisibile no.
   */
  const daScadere = await sql<{ id: string; provider_payment_id: string | null }[]>`
    select id, provider_payment_id from payments
     where table_session_id = ${session.id} and status = 'pending'
       and created_at < now() - interval '10 minutes'`;

  for (const p of daScadere) {
    if (p.provider_payment_id?.startsWith("pi_")) {
      try {
        await stripe.paymentIntents.cancel(p.provider_payment_id, {
          stripeAccount: venue.stripe_account_id,
        });
      } catch (err) {
        // Se l'intent non esiste più non c'è nulla da annullare e archiviare
        // è giusto. Su qualsiasi altro errore — rete, 429, o un intent già
        // riuscito che Stripe rifiuta di annullare — la riga resta 'pending':
        // nel secondo caso è proprio il webhook che deve promuoverla.
        if (!intentSconosciuto(err)) {
          console.warn(
            `[create-intent] intent scaduto ${p.id} non annullato, riga lasciata pending: ${messaggioErrore(err)}`
          );
          continue;
        }
      }
    }
    await sql`update payments set status = 'failed' where id = ${p.id}`;
  }

  const splitItemIds = body.orderItemIds?.filter(Boolean) ?? [];
  const isSplit = splitItemIds.length > 0;

  /*
   * Non due pagamenti in volo sullo stesso tavolo.
   *
   * Il saldo sottrae solo i pagamenti riusciti: mentre A stava pagando i
   * propri piatti alla romana, B vedeva ancora il totale pieno e poteva
   * pagare tutto. Riuscivano entrambi e il tavolo versava due volte gli
   * stessi piatti, senza alcun rimborso automatico.
   *
   * Meglio far aspettare qualche secondo che restituire soldi: chi arriva
   * secondo legge cosa sta succedendo invece di trovarsi un addebito doppio.
   */
  const [altroInCorso] = await sql<{ split_type: string | null }[]>`
    select split_type from payments
     where table_session_id = ${session.id} and status = 'pending'
     limit 1`;

  if (altroInCorso && !isSplit) {
    return NextResponse.json(
      {
        error:
          altroInCorso.split_type === "per_item"
            ? "Qualcuno al tavolo sta pagando i suoi piatti. Aspetta che finisca, poi riprova."
            : "Un pagamento su questo tavolo è già in corso. Aspetta che finisca, poi riprova.",
      },
      { status: 409 }
    );
  }

  if (altroInCorso && isSplit && altroInCorso.split_type !== "per_item") {
    return NextResponse.json(
      { error: "Qualcuno sta pagando l'intero conto. Aspetta che finisca, poi riprova." },
      { status: 409 }
    );
  }

  if (isSplit) {
    return createSplitPayment({
      sql,
      stripe,
      session,
      venue: { stripeAccountId: venue.stripe_account_id, currency: venue.currency },
      tipCents,
      orderItemIds: splitItemIds,
    });
  }

  // Doppio tap sul bottone Paga (o refresh pagina) non deve creare un
  // secondo PaymentIntent: riusa quello pending esistente se ancora valido.
  // Solo i pending di Stripe: senza il filtro sul provider, un tentativo
  // Satispay abbandonato veniva raccolto qui e il suo identificativo passato
  // a stripe.paymentIntents.retrieve(). Stripe rispondeva resource_missing,
  // l'eccezione non era catturata e il cliente leggeva "Connessione assente",
  // senza che nessun pagamento con carta potesse più riuscire finché quella
  // riga restava lì.
  const [existingPending] = await sql<{ id: string; provider_payment_id: string }[]>`
    select id, provider_payment_id from payments
    where table_session_id = ${session.id} and status = 'pending'
      and split_type = 'full' and provider = 'stripe'
      and provider_payment_id is not null`;

  if (existingPending) {
    /*
     * Un intent che Stripe non conosce più non deve bloccare il tavolo: si
     * archivia il pending e si riparte da capo.
     *
     * Ma solo se Stripe dice davvero che non esiste. Il catch qui era nudo e
     * prendeva tutto: un timeout, un 429, un 500 di passaggio finivano
     * archiviati come "pagamento fallito" mentre l'intent restava
     * confermabile. Il saldo sottrae solo i pagamenti riusciti, quindi
     * restava pieno e poche righe più sotto nasceva un secondo intent
     * sull'intero conto: chi era fermo sul 3DS confermava il primo e il
     * tavolo pagava due volte. Il webhook non recuperava — promuove solo le
     * righe 'pending' — e l'eccedenza non compariva né nel conto né
     * nell'analisi, perché il saldo negativo viene azzerato.
     *
     * Su un errore di rete la risposta giusta è "riprova fra un momento":
     * fastidioso, ma un tavolo che riprova costa infinitamente meno di un
     * addebito doppio che nessuno vede.
     */
    let existingIntent;
    try {
      existingIntent = await stripe.paymentIntents.retrieve(
        existingPending.provider_payment_id,
        { stripeAccount: venue.stripe_account_id }
      );
    } catch (err) {
      if (!intentSconosciuto(err)) {
        console.error(
          `[create-intent] Stripe non raggiungibile sul pending ${existingPending.id}: ${messaggioErrore(err)}`
        );
        return NextResponse.json(
          { error: "Pagamento non disponibile in questo momento, riprova fra poco" },
          { status: 503 }
        );
      }
      await sql`update payments set status = 'failed' where id = ${existingPending.id}`;
      existingIntent = null;
    }

    if (existingIntent) {
      if (
        ["requires_payment_method", "requires_confirmation", "requires_action"].includes(
          existingIntent.status
        )
      ) {
        return NextResponse.json({
          clientSecret: existingIntent.client_secret,
          amountCents: existingIntent.amount,
        });
      }

      if (existingIntent.status === "succeeded") {
        return NextResponse.json({ error: "Conto già pagato" }, { status: 409 });
      }

      // canceled/failed lato Stripe ma la riga da noi è rimasta 'pending'
      // (webhook non ancora arrivato) — libera lo slot e permette un nuovo
      // tentativo.
      await sql`update payments set status = 'failed' where id = ${existingPending.id}`;
    }
  }

  const balanceCents = await outstandingBalanceCents(session.id);
  const amountCents = balanceCents + tipCents;
  if (amountCents <= 0) {
    return NextResponse.json({ error: "Nessun importo da pagare" }, { status: 409 });
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: (venue.currency ?? "eur").toLowerCase(),
      automatic_payment_methods: { enabled: true },
      application_fee_amount: Math.round(amountCents * 0.015), // margine piattaforma, provvisorio
      metadata: { table_session_id: session.id, venue_id: session.venue_id },
    },
    { stripeAccount: venue.stripe_account_id }
  );

  try {
    await sql`
      insert into payments (
        venue_id, table_session_id, amount_cents, tip_cents,
        method, provider, provider_payment_id, split_type, status
      ) values (
        ${session.venue_id}, ${session.id}, ${balanceCents}, ${tipCents},
        'card', 'stripe', ${intent.id}, 'full', 'pending'
      )`;
  } catch (err) {
    // Race genuina: un'altra richiesta ha inserito il pending un istante
    // prima (vinta dallo unique index). Annulla l'intent orfano appena
    // creato e ritorna quello del vincitore, invece di sprecarlo/duplicarlo.
    const isUniqueViolation = err instanceof Error && "code" in err && err.code === "23505";
    if (!isUniqueViolation) throw err;

    await stripe.paymentIntents.cancel(intent.id, { stripeAccount: venue.stripe_account_id });

    const [winner] = await sql<{ provider_payment_id: string }[]>`
      select provider_payment_id from payments
      where table_session_id = ${session.id} and status = 'pending' and split_type = 'full'`;
    const winnerIntent = await stripe.paymentIntents.retrieve(winner.provider_payment_id, {
      stripeAccount: venue.stripe_account_id,
    });
    return NextResponse.json({
      clientSecret: winnerIntent.client_secret,
      amountCents: winnerIntent.amount,
    });
  }

  return NextResponse.json({ clientSecret: intent.client_secret, amountCents });
}

/**
 * Pagamento di alcuni piatti soltanto. Più commensali possono pagare in
 * contemporanea, quindi la corsa da evitare non è "due pagamenti sullo
 * stesso tavolo" ma "due pagamenti sullo stesso piatto": le righe scelte
 * vengono bloccate con SELECT ... FOR UPDATE e impegnate in
 * payment_order_items dentro la stessa transazione.
 */
async function createSplitPayment(params: {
  sql: ReturnType<typeof db>;
  stripe: ReturnType<typeof stripeClient>;
  session: { id: string; venue_id: string };
  venue: { stripeAccountId: string; currency: string };
  tipCents: number;
  orderItemIds: string[];
}) {
  const { sql, stripe, session, venue, tipCents, orderItemIds } = params;

  let claimed: { id: string; amount_cents: number }[];
  try {
    claimed = await sql.begin(async (tx) => {
      const rows = await tx<{ id: string; amount_cents: number }[]>`
        select oi.id, (oi.quantity * oi.unit_price_cents) as amount_cents
        from order_items oi
        join orders o on o.id = oi.order_id
        where oi.id in ${tx(orderItemIds)}
          and o.table_session_id = ${session.id}
          and o.status != 'cancelled'
          and oi.status != 'cancelled'
          and not exists (
            select 1 from payment_order_items poi
            join payments p on p.id = poi.payment_id
            where poi.order_item_id = oi.id and p.status in ('pending', 'succeeded')
          )
        for update of oi`;

      if (rows.length !== orderItemIds.length) {
        throw new Error("ITEMS_UNAVAILABLE");
      }
      return rows;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ITEMS_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Alcuni piatti sono già stati pagati o sono in pagamento" },
        { status: 409 }
      );
    }
    throw err;
  }

  const itemsTotal = claimed.reduce((sum, r) => sum + r.amount_cents, 0);
  const amountCents = itemsTotal + tipCents;
  if (amountCents <= 0) {
    return NextResponse.json({ error: "Nessun importo da pagare" }, { status: 409 });
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: (venue.currency ?? "eur").toLowerCase(),
      automatic_payment_methods: { enabled: true },
      application_fee_amount: Math.round(amountCents * 0.015),
      metadata: { table_session_id: session.id, venue_id: session.venue_id },
    },
    { stripeAccount: venue.stripeAccountId }
  );

  await sql.begin(async (tx) => {
    const [payment] = await tx<{ id: string }[]>`
      insert into payments (
        venue_id, table_session_id, amount_cents, tip_cents,
        method, provider, provider_payment_id, split_type, status
      ) values (
        ${session.venue_id}, ${session.id}, ${itemsTotal}, ${tipCents},
        'card', 'stripe', ${intent.id}, 'per_item', 'pending'
      ) returning id`;

    for (const item of claimed) {
      await tx`
        insert into payment_order_items (payment_id, order_item_id, amount_cents)
        values (${payment.id}, ${item.id}, ${item.amount_cents})`;
    }
  });

  return NextResponse.json({ clientSecret: intent.client_secret, amountCents });
}
