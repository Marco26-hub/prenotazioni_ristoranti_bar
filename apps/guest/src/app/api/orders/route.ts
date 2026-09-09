import { NextResponse } from "next/server";
import type { Sql, TransactionSql } from "postgres";
import { db } from "@repo/shared/db";
import { checkRateLimit } from "@repo/shared/rate-limit";
import { hasModulo } from "@repo/shared";
import { gruppiPerPiatti, calcolaPrezzo } from "@repo/shared/varianti";
import { tApi, linguaRichiesta } from "@/i18n/api";

interface CreateOrderBody {
  sessionId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    notes?: string;
    /** Solo gli id delle opzioni scelte: il prezzo lo calcola il server. */
    optionIds?: string[];
  }>;
}

/** Le stesse query servono sulla connessione e dentro la transazione. */
type QuerySql = Sql | TransactionSql;

/** O l'ordine è stato scritto, o il tavolo deve ancora aspettare. */
type EsitoOrdine =
  | { attesa: number }
  | { id: string; numero: number | null };

/** Le note finiscono stampate in comanda: tagliate, non rifiutate. */
const MAX_NOTE_LENGTH = 140;

/** Invii per finestra e ampiezza della finestra del limite anti-abuso. */
const INVII_PER_FINESTRA = 20;
const FINESTRA_SECONDI = 60;

export async function POST(request: Request) {
  const t = tApi(linguaRichiesta(request));

  const body = (await request.json().catch(() => null)) as CreateOrderBody | null;

  if (!body?.sessionId || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: t("errore.payload_non_valido") }, { status: 400 });
  }
  if (body.items.some((i) => !i.menuItemId || !Number.isInteger(i.quantity) || i.quantity < 1)) {
    return NextResponse.json({ error: t("ordine.errore.righe_non_valide") }, { status: 400 });
  }

  const sql = db();

  // La sessione deve esistere ed essere aperta — il sessionId da solo non
  // autorizza nulla, ma limita la scrittura a un tavolo con sessione attiva.
  const [session] = await sql<{ id: string; venue_id: string; status: string }[]>`
    select id, venue_id, status from table_sessions where id = ${body.sessionId}`;

  if (!session || session.status !== "open") {
    return NextResponse.json({ error: t("errore.sessione_tavolo_non_valida") }, { status: 404 });
  }

  /*
   * Il limite anti-abuso è per sessione tavolo, non per indirizzo IP.
   *
   * Sul wifi del locale l'indirizzo è uno solo per l'intera sala: otto
   * tavoli che ordinano insieme all'inizio del turno si bruciavano il
   * budget a vicenda, e il minuto peggiore della serata era proprio quello.
   * La sessione è il tavolo, ed è quello che va protetto da sé stesso.
   *
   * Sta qui e non in cima perché prima serve sapere di che sessione si
   * tratta: una richiesta senza sessione valida non arriva comunque a
   * scrivere niente.
   */
  const { allowed } = await checkRateLimit(
    `orders:${session.id}`,
    INVII_PER_FINESTRA,
    FINESTRA_SECONDI
  );
  if (!allowed) {
    return NextResponse.json(
      {
        error: t("errore.troppe_richieste_riprova"),
        // Senza questo il bottone restava acceso e invitava a ripremere,
        // consumando altro budget: la finestra è l'attesa massima.
        attesaSecondi: FINESTRA_SECONDI,
      },
      { status: 429 }
    );
  }

  // Il servizio è a canone: se il locale non ha un abbonamento valido i suoi
  // clienti non possono ordinare. Il controllo sta qui e non solo in UI
  // perché questo endpoint è pubblico.
  const [venueSub] = await sql<
    {
      subscription_status: string;
      subscription_period_end: Date | null;
      modules: string[] | null;
      ordine_intervallo_min: number;
    }[]
  >`select subscription_status, subscription_period_end, modules,
           ordine_intervallo_min
      from venues where id = ${session.venue_id}`;

  if (
    !hasModulo(
      "ordini",
      venueSub?.subscription_status,
      venueSub?.subscription_period_end,
      venueSub?.modules
    )
  ) {
    return NextResponse.json(
      { error: t("ordine.errore.non_attivo") },
      { status: 402 }
    );
  }

  const ritiroAttivo = hasModulo(
    "ritiro",
    venueSub?.subscription_status,
    venueSub?.subscription_period_end,
    venueSub?.modules
  );

  /*
   * Intervallo fra un'ordinazione e la successiva.
   *
   * È il metodo degli all-you-can-eat: si ordina a piccole ondate, con
   * qualche minuto in mezzo. Senza, un tavolo da sei manda ottanta piatti in
   * tre minuti, la cucina li prepara tutti insieme e metà arrivano freddi —
   * o restano nel piatto, che nella formula a prezzo fisso è lo spreco che
   * manda in perdita il servizio.
   *
   * Il controllo sta qui e non solo nel bottone: questo endpoint è pubblico,
   * e un'attesa che si aggira con una richiesta a mano non è un'attesa.
   * L'attesa si conta dal database, non dall'orologio del telefono, che il
   * cliente può spostare.
   */
  const attesaMin = venueSub?.ordine_intervallo_min ?? 0;

  if (attesaMin > 0) {
    const mancano = await secondiDiAttesa(sql, session.id, attesaMin);

    if (mancano > 0) {
      return NextResponse.json(
        { error: testoAttesa(t, mancano), attesaSecondi: mancano },
        { status: 429 }
      );
    }
  }

  // Lo stesso piatto può comparire in più righe con varianti diverse
  // (porzione intera e mezza, formati, aggiunte). La query restituisce una
  // sola voce per id: confrontarla con tutte le righe produceva il falso
  // errore "Piatto non trovato" mostrato al cliente.
  const menuItemIds = [...new Set(body.items.map((i) => i.menuItemId))];
  const menuItems = await sql<
    { id: string; price_cents: number; available: boolean; venue_id: string }[]
  >`select id, price_cents, available, venue_id from menu_items where id in ${sql(menuItemIds)}`;

  if (menuItems.length !== menuItemIds.length) {
    return NextResponse.json({ error: t("ordine.errore.piatto_non_trovato") }, { status: 404 });
  }
  if (menuItems.some((m) => m.venue_id !== session.venue_id || !m.available)) {
    return NextResponse.json({ error: t("ordine.errore.piatto_non_disponibile") }, { status: 409 });
  }

  const priceByItem = new Map(menuItems.map((m) => [m.id, m.price_cents]));

  // Il prezzo definitivo di ogni riga si ricava qui dagli id delle opzioni:
  // quello che arriva dal browser non viene mai usato, perché chiunque può
  // riscriverlo prima di inviarlo.
  const gruppi = await gruppiPerPiatti(sql, session.venue_id, menuItemIds);

  const righe: Array<{
    menuItemId: string;
    quantity: number;
    notes: string | null;
    prezzoUnitario: number;
    scelte: unknown[];
  }> = [];

  for (const line of body.items) {
    const scelteIds = Array.isArray(line.optionIds)
      ? line.optionIds.filter((id): id is string => typeof id === "string")
      : [];

    const esito = calcolaPrezzo(
      priceByItem.get(line.menuItemId)!,
      gruppi.get(line.menuItemId) ?? [],
      scelteIds
    );

    if (esito.errore) {
      return NextResponse.json({ error: esito.errore }, { status: 409 });
    }

    righe.push({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      notes:
        typeof line.notes === "string" && line.notes.trim()
          ? line.notes.trim().slice(0, MAX_NOTE_LENGTH)
          : null,
      prezzoUnitario: esito.prezzoUnitario!,
      scelte: esito.scelte!,
    });
  }

  const esitoOrdine = await sql.begin(async (tx): Promise<EsitoOrdine> => {
    /*
     * Fra il controllo dell'attesa e la scrittura ci sono altre due query.
     * In quella finestra due telefoni dello stesso tavolo che premevano
     * insieme passavano tutti e due, e in cucina arrivavano due comande
     * complete invece di una. Il lock sulla sessione mette in fila i due
     * invii, e il secondo ricontrolla l'attesa quando il primo ha già
     * scritto: esce senza aver scritto niente.
     */
    await tx`select id from table_sessions where id = ${session.id} for update`;

    if (attesaMin > 0) {
      const mancano = await secondiDiAttesa(tx, session.id, attesaMin);
      if (mancano > 0) return { attesa: mancano };
    }

    /*
     * Numero di ritiro, dove si serve al banco.
     *
     * Riparte da uno a ogni giornata di servizio — non a mezzanotte: un
     * locale che chiude alle due avrebbe altrimenti due serie nella stessa
     * serata, e due clienti col numero 7 davanti allo stesso bancone.
     *
     * Il contatore è una riga sola per locale e per giornata, aggiornata in
     * transazione: due ordini arrivati nello stesso istante prendono due
     * numeri diversi perché il secondo aspetta il primo.
     */
    const [conta] = await tx<{ numero: number; giornata: string }[]>`
      insert into order_number_counters (venue_id, service_date, last_number)
      select ${session.venue_id},
             ((now() at time zone coalesce(v.timezone, 'Europe/Rome'))
               - make_interval(hours => v.giornata_stacco_ora))::date,
             1
        from venues v
       where v.id = ${session.venue_id}
         and v.pickup_numbering_enabled
         and ${ritiroAttivo}
      on conflict (venue_id, service_date)
      do update set last_number = order_number_counters.last_number + 1
      returning last_number as numero, service_date::text as giornata`;

    const [order] = await tx<{ id: string }[]>`
      insert into orders (venue_id, table_session_id, status,
                          pickup_number, pickup_service_date)
      values (${session.venue_id}, ${session.id}, 'confirmed',
              ${conta?.numero ?? null}, ${conta?.giornata ?? null})
      returning id`;

    for (const r of righe) {
      await tx`
        insert into order_items (order_id, menu_item_id, quantity, unit_price_cents,
                                 notes, status, selected_options)
        values (
          ${order.id},
          ${r.menuItemId},
          ${r.quantity},
          ${r.prezzoUnitario},
          ${r.notes},
          'sent_to_kitchen',
          ${tx.json(r.scelte as never)}
        )`;
    }

    return { id: order.id, numero: conta?.numero ?? null };
  });

  if ("attesa" in esitoOrdine) {
    return NextResponse.json(
      { error: testoAttesa(t, esitoOrdine.attesa), attesaSecondi: esitoOrdine.attesa },
      { status: 429 }
    );
  }

  return NextResponse.json(
    { orderId: esitoOrdine.id, numeroRitiro: esitoOrdine.numero },
    { status: 201 }
  );
}

/**
 * Secondi che mancano al tavolo prima di poter ordinare di nuovo.
 *
 * Si conta dal database e non dall'orologio del telefono, che il cliente
 * può spostare. Serve identica fuori e dentro la transazione, dove il
 * secondo invio la ripete dopo il lock.
 */
async function secondiDiAttesa(
  sql: QuerySql,
  sessionId: string,
  attesaMin: number
): Promise<number> {
  const [ultimo] = await sql<{ mancano: number }[]>`
    select ceil(extract(epoch from (
             max(created_at) + make_interval(mins => ${attesaMin}) - now()
           )))::int as mancano
      from orders
     where table_session_id = ${sessionId} and status <> 'cancelled'`;

  return ultimo?.mancano ?? 0;
}

/**
 * Il messaggio dell'attesa nomina il tavolo, non chi legge.
 *
 * L'intervallo si conta per sessione, cioè per tavolo: al tavolo da sei,
 * gli altri cinque non hanno ordinato niente e si sentivano dire che
 * possono ordinare «di nuovo». Sembrava un'app rotta, e finiva in una
 * chiamata al cameriere.
 */
function testoAttesa(t: ReturnType<typeof tApi>, mancano: number): string {
  return t.n(Math.ceil(mancano / 60), "ordine.attesa_tavolo");
}
