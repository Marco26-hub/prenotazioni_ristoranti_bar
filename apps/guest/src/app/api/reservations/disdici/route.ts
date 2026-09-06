import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";
import { inviaEmail } from "@repo/shared/email";
import { formattaOrarioLingua } from "@repo/shared/prenotazioni";
import { messaggioErrore } from "@repo/shared/errori";
import { decryptSecret } from "@repo/shared/crypto";
import { tApi, linguaRichiesta } from "@/i18n/api";
import { tEmail } from "@repo/shared/i18n/email";
import { normalizzaLinguaUI } from "@repo/shared/i18n";

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
  const t = tApi(linguaRichiesta(request));

  const corpo = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = corpo?.token?.trim();

  if (!token || token.length < 16 || token.length > 64) {
    return NextResponse.json({ error: t("disdetta.errore.link_non_valido") }, { status: 400 });
  }

  // Il token è segreto e non si indovina, ma il limite ferma comunque chi
  // prova a farlo a raffica.
  const { allowed } = await checkRateLimit(clientKey(request, "disdici"), 20, 3600);
  if (!allowed) {
    return NextResponse.json({ error: t("disdetta.errore.troppi_tentativi") }, { status: 429 });
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
       -- 'declined' compreso: disdire una richiesta che il locale ha già
       -- rifiutato cancellava il motivo del rifiuto e mandava al locale
       -- l'avviso che si era liberato un tavolo che non aveva mai dato.
       and status not in ('cancelled', 'declined', 'seated', 'no_show')
       and reserved_at > now()
    returning id, customer_name, party_size, reserved_at, venue_id`;

  if (!r) {
    // Già disdetta, passata, o token inesistente: la pagina lo spiega senza
    // dire quale dei tre, che sarebbe un modo per sondare i token altrui.
    return NextResponse.json({ error: t("disdetta.errore.non_disdicibile") }, { status: 409 });
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
      lingua_predefinita: string;
    }[]
  >`select name, slug, reservation_email, public_email, timezone,
           resend_api_key, resend_from, lingua_predefinita
      from venues where id = ${r.venue_id}`;

  const destinatario = venue?.reservation_email ?? venue?.public_email;

  if (destinatario) {
    /*
     * L'avviso lo legge il locale, non il cliente: la lingua non è quella
     * della richiesta — quella è del cliente che ha disdetto — ma quella che
     * il locale ha dichiarato per sé. Non c'è un utente collegato da cui
     * dedurla, e un locale che ha messo le sue pagine in inglese è un locale
     * dove in inglese si legge.
     */
    const tl = tEmail(normalizzaLinguaUI(venue?.lingua_predefinita) ?? "it");
    const quando = formattaOrarioLingua(
      r.reserved_at,
      venue?.timezone ?? "Europe/Rome",
      tl.lingua
    );
    const esito = await inviaEmail({
      a: destinatario,
      mittenteLocale: (() => {
        // Cifrata nel database: passandola così com'è Resend rifiuta
        // l'autenticazione e l'avviso al locale non parte mai.
        if (!venue?.resend_api_key || !venue?.resend_from) return undefined;
        try {
          return { apiKey: decryptSecret(venue.resend_api_key), from: venue.resend_from };
        } catch {
          console.error("[disdici] chiave email del locale illeggibile");
          return undefined;
        }
      })(),
      oggetto: tl("disdetta.locale.oggetto", {
        nome: r.customer_name,
        persone: r.party_size,
        quando,
      }),
      testo: [
        tl("disdetta.locale.testo"),
        "",
        tl("disdetta.locale.nome", { nome: r.customer_name }),
        tl("disdetta.locale.persone", { persone: r.party_size }),
        tl("disdetta.locale.quando", { quando }),
        "",
        tl("disdetta.locale.libero"),
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
