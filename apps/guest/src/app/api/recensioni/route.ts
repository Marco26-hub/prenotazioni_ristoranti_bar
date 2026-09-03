import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";

/**
 * Recensione lasciata dal tavolo.
 *
 * Il momento giusto è quello: si è appena mangiato, il telefono è già in mano
 * e il menu è già aperto. Una mail il giorno dopo ottiene una risposta su
 * venti, e arriva quando non si può più rimediare a niente.
 *
 * Il voto resta al locale. Il link pubblico, se il locale ne ha impostato
 * uno, viene restituito a chiunque abbia votato — non solo a chi ha messo
 * cinque stelle: filtrare chi mandare su Google è contro le loro regole e,
 * a parte quello, falsifica il giudizio che il prossimo cliente legge.
 */

interface Corpo {
  token: string;
  voto: number;
  commento?: string;
  nome?: string;
}

export async function POST(request: Request) {
  // Un tavolo lascia una recensione, non venti: il limite protegge la media
  // di un locale da chi si diverte a premere invio.
  const { allowed } = await checkRateLimit(clientKey(request, "recensione"), 5, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Hai già lasciato la tua opinione. Grazie!" },
      { status: 429 }
    );
  }

  const corpo = (await request.json().catch(() => null)) as Corpo | null;
  const voto = Number(corpo?.voto);

  if (!corpo?.token || !Number.isInteger(voto) || voto < 1 || voto > 5) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const sql = db();

  /*
   * Il token del QR è l'unica autorizzazione, e vale anche a conto chiuso.
   *
   * Chi ha appena pagato è esattamente la persona a cui si sta chiedendo, e
   * la sessione a quel punto è 'closed': accettare solo i tavoli aperti
   * avrebbe respinto proprio le recensioni che interessano. Si prende
   * l'ultima sessione di quel tavolo, purché di oggi — un token vecchio non
   * deve poter scrivere per un servizio di tre settimane fa.
   */
  const [sessione] = await sql<
    { id: string; venue_id: string; google_review_url: string | null }[]
  >`
    select ts.id, ts.venue_id, v.google_review_url
      from table_sessions ts
      join tables t on t.id = ts.table_id
      join venues v on v.id = ts.venue_id
     where t.qr_token = ${corpo.token}
       and ts.opened_at > now() - interval '12 hours'
     order by ts.opened_at desc
     limit 1`;

  if (!sessione) {
    return NextResponse.json(
      { error: "Nessun servizio recente a questo tavolo" },
      { status: 404 }
    );
  }

  /*
   * Una per servizio, e la seconda sovrascrive la prima.
   *
   * Chi ha votato tre stelle e poi ci ripensa deve poter correggere: bloccare
   * il secondo invio lascerebbe a schermo un voto che la persona non pensa
   * più, e non c'è ragione di preferire il primo.
   */
  await sql`
    insert into reviews (venue_id, table_session_id, voto, commento, nome)
    values (${sessione.venue_id}, ${sessione.id}, ${voto},
            ${corpo.commento?.trim().slice(0, 2000) || null},
            ${corpo.nome?.trim().slice(0, 80) || null})
    on conflict (table_session_id) where table_session_id is not null
    do update set voto = excluded.voto,
                  commento = excluded.commento,
                  nome = excluded.nome,
                  created_at = now(),
                  letta_at = null`;

  return NextResponse.json({
    ok: true,
    // Restituito a chiunque abbia votato, qualunque sia il voto.
    linkPubblico: sessione.google_review_url,
  });
}
