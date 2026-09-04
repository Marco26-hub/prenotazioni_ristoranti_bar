import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";
import { inviaEmail } from "@repo/shared/email";
import { formattaOrario } from "@repo/shared/prenotazioni";
import { messaggioErrore } from "@repo/shared/errori";

/**
 * Disdetta della prenotazione da parte del cliente.
 *
 * Il token è l'unica autorizzazione: chi ce l'ha è chi ha ricevuto l'email
 * di conferma, e non dà accesso a nient'altro.
 *
 * Il locale va avvisato subito, non alla lettura di un elenco: un tavolo che
 * si libera alle undici del mattino si riempie ancora, uno che si scopre
 * libero alle nove di sera no.
 */
export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = corpo?.token?.trim();

  if (!token || token.length < 16 || token.length > 64) {
    return NextResponse.json({ error: "Link non valido" }, { status: 400 });
  }

  // Il token è segreto e non si indovina, ma il limite ferma comunque chi
  // prova a farlo a raffica.
  const { allowed } = await checkRateLimit(clientKey(request, "disdici"), 20, 3600);
  if (!allowed) {
    return NextResponse.json({ error: "Troppi tentativi" }, { status: 429 });
  }

  const sql = db();

  /*
   * Si disdice solo una prenotazione futura e ancora viva.
   *
   * La condizione sta nella UPDATE e non in una lettura precedente: fra il
   * controllo e la scrittura il locale potrebbe aver già fatto la sua mossa,
   * e due disdette sulla stessa riga manderebbero due email al locale per un
   * tavolo solo.
   */
  const [r] = await sql<
    {
      id: string;
      customer_name: string;
      party_size: number;
      reserved_at: Date;
      venue_id: string;
    }[]
  >`
    update reservations
       set status = 'cancelled',
           disdetta_dal_cliente_at = now(),
           decline_reason = 'Disdetta dal cliente'
     where cancel_token = ${token}
       and status not in ('cancelled', 'seated', 'no_show')
       and reserved_at > now()
    returning id, customer_name, party_size, reserved_at, venue_id`;

  if (!r) {
    // Già disdetta, passata, o token inesistente: la pagina lo spiega senza
    // dire quale dei tre, che sarebbe un modo per sondare i token altrui.
    return NextResponse.json({ error: "Prenotazione non disdicibile" }, { status: 409 });
  }

  // Il tavolo assegnato torna libero: resta occupato solo finché la
  // prenotazione è viva, e questa non lo è più.
  await sql`delete from reservation_tables where reservation_id = ${r.id}`;

  const [venue] = await sql<
    {
      name: string;
      slug: string;
      reservation_email: string | null;
      public_email: string | null;
      timezone: string | null;
      resend_api_key: string | null;
      resend_from: string | null;
    }[]
  >`select name, slug, reservation_email, public_email, timezone,
           resend_api_key, resend_from
      from venues where id = ${r.venue_id}`;

  const destinatario = venue?.reservation_email ?? venue?.public_email;

  if (destinatario) {
    const quando = formattaOrario(r.reserved_at, venue?.timezone ?? "Europe/Rome");
    const esito = await inviaEmail({
      a: destinatario,
      mittenteLocale:
        venue?.resend_api_key && venue?.resend_from
          ? { apiKey: venue.resend_api_key, from: venue.resend_from }
          : undefined,
      oggetto: `Disdetta — ${r.customer_name}, ${r.party_size}p, ${quando}`,
      testo: [
        "Una prenotazione è stata disdetta dal cliente.",
        "",
        `Nome: ${r.customer_name}`,
        `Persone: ${r.party_size}`,
        `Quando era: ${quando}`,
        "",
        "Il tavolo è tornato libero ed è di nuovo prenotabile.",
      ].join("\n"),
    });

    if (!esito.inviata) {
      // La disdetta è avvenuta comunque: l'email mancata non la annulla, ma
      // va saputo, o il locale scopre il tavolo libero solo aprendo la pagina.
      console.error(
        `[disdici] avviso al locale non inviato per ${r.id}: ${messaggioErrore(esito.errore)}`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
