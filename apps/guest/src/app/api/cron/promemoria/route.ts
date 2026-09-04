import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { inviaEmail } from "@repo/shared/email";
import { formattaOrario } from "@repo/shared/prenotazioni";
import { linkDisdetta } from "@repo/shared/prenotazioni-token";
import { messaggioErrore } from "@repo/shared/errori";

/**
 * Promemoria alle prenotazioni del giorno dopo.
 *
 * Chi prenota una settimana prima se ne dimentica, e il locale scopre alle
 * nove che quel tavolo non arriva — con la sera già persa e nessuno a cui
 * darlo. Un promemoria il giorno prima, con dentro il link per disdire,
 * trasforma il dimenticato in un tavolo che si libera in tempo.
 *
 * Gira ogni ora. La finestra è di un'ora e le righe vengono prese una volta
 * sola: non serve che l'esecuzione sia puntuale, serve che non mandi due
 * volte la stessa email.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  /*
   * Solo il pianificatore.
   *
   * È un endpoint pubblico che manda email: senza questo controllo chiunque
   * conosca l'indirizzo potrebbe farlo scattare a ripetizione. Vercel manda
   * `Authorization: Bearer $CRON_SECRET` sulle sue chiamate pianificate.
   */
  const atteso = process.env.CRON_SECRET;
  if (!atteso) {
    console.error("[promemoria] CRON_SECRET mancante: promemoria non inviati");
    return NextResponse.json({ error: "Non configurato" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${atteso}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const sql = db();

  /*
   * Le righe si prendono scrivendo, non leggendo.
   *
   * Marcare prima e mandare poi significa che un invio fallito resta non
   * mandato; leggere prima e marcare dopo significa che un'esecuzione
   * interrotta a metà rimanda tutto una seconda volta. Fra un promemoria
   * mancato e un promemoria doppio, il primo si nota molto meno — e l'errore
   * resta scritto sulla riga, così il locale può vederlo.
   */
  const righe = await sql<
    {
      id: string;
      customer_name: string;
      customer_email: string;
      party_size: number;
      reserved_at: Date;
      cancel_token: string | null;
      venue_name: string;
      slug: string;
      public_phone: string | null;
      timezone: string | null;
      resend_api_key: string | null;
      resend_from: string | null;
      reservation_email: string | null;
      public_email: string | null;
    }[]
  >`
    update reservations r
       set promemoria_inviato_at = now()
      from venues v
     where v.id = r.venue_id
       and r.promemoria_inviato_at is null
       and r.status in ('confirmed', 'pending')
       and r.customer_email is not null
       -- Fra 23 e 25 ore: il giro è orario, quindi ogni prenotazione cade
       -- in una finestra sola e nessuna resta scoperta fra un giro e l'altro.
       and r.reserved_at between now() + interval '23 hours'
                             and now() + interval '25 hours'
    returning r.id, r.customer_name, r.customer_email, r.party_size,
              r.reserved_at, r.cancel_token,
              v.name as venue_name, v.slug, v.public_phone, v.timezone,
              v.resend_api_key, v.resend_from,
              v.reservation_email, v.public_email`;

  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://ristoranti-guest.vercel.app";

  let inviati = 0;
  let falliti = 0;

  for (const r of righe) {
    const fuso = r.timezone ?? "Europe/Rome";
    const quando = formattaOrario(r.reserved_at, fuso);

    const esito = await inviaEmail({
      a: r.customer_email,
      rispondiA: r.reservation_email ?? r.public_email ?? undefined,
      mittenteLocale:
        r.resend_api_key && r.resend_from
          ? { apiKey: r.resend_api_key, from: r.resend_from }
          : undefined,
      oggetto: `Domani ti aspettiamo — ${r.venue_name}`,
      testo: [
        `Ciao ${r.customer_name},`,
        "",
        `un promemoria: domani hai un tavolo da ${r.venue_name}.`,
        "",
        `Quando: ${quando}`,
        `Persone: ${r.party_size}`,
        "",
        r.public_phone
          ? `Se cambia qualcosa chiamaci al ${r.public_phone}.`
          : "Se cambia qualcosa rispondi a questa email.",
        ...(r.cancel_token
          ? [
              "",
              "Se non riesci a venire, disdici da qui: ci vuole un momento e",
              "il tavolo torna disponibile per qualcun altro.",
              linkDisdetta(base, r.slug, r.cancel_token),
            ]
          : []),
      ].join("\n"),
    });

    if (esito.inviata) {
      inviati += 1;
    } else {
      falliti += 1;
      await sql`
        update reservations
           set promemoria_errore = ${esito.errore ?? "invio non riuscito"}
         where id = ${r.id}`;
      console.error(
        `[promemoria] non inviato a ${r.id}: ${messaggioErrore(esito.errore)}`
      );
    }
  }

  return NextResponse.json({ presi: righe.length, inviati, falliti });
}
