"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";

/**
 * Coperti del tavolo.
 *
 * La colonna esisteva da sempre con valore 1 e non la scriveva nessuno:
 * qualunque analisi su scontrino medio per coperto restituiva quindi il
 * totale del tavolo. Senza questo dato l'unico numero utile a un
 * ristoratore — quanto spende una persona — non è calcolabile.
 */
export async function impostaCoperti(
  sessionId: string,
  coperti: number
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireVenue();

  if (!Number.isInteger(coperti) || coperti < 1 || coperti > 50) {
    return { error: "Numero di coperti non valido" };
  }

  const sql = db();

  /*
   * I bambini non possono superare i coperti.
   *
   * Scendendo da sei a due commensali, i quattro bambini segnati prima
   * renderebbero negativo il conto degli adulti — e il tavolo pagherebbe
   * meno di zero senza che nessuno se ne accorga.
   */
  const righe = await sql`
    update table_sessions
       set guest_count = ${coperti},
           bambini = least(bambini, ${coperti})
     where id = ${sessionId} and venue_id = ${venue.venueId}
       and status <> 'closed'
    returning id`;

  if (righe.length === 0) return { error: "Tavolo non trovato o già chiuso" };

  revalidatePath("/dashboard");
  return { ok: "Coperti aggiornati." };
}

/**
 * Questo tavolo è a formula, o paga i piatti alla carta.
 *
 * Si decide per tavolo e non per locale: lo stesso ristorante lavora a
 * formula la sera e alla carta a pranzo, e capita il tavolo che vuole
 * ordinare due piatti e basta.
 */
export async function impostaFormula(
  sessionId: string,
  attiva: boolean
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireVenue();
  const sql = db();

  const righe = await sql`
    update table_sessions set formula = ${attiva}
     where id = ${sessionId} and venue_id = ${venue.venueId}
       and status <> 'closed'
    returning id`;

  if (righe.length === 0) return { error: "Tavolo non trovato o già chiuso" };

  revalidatePath("/dashboard");
  return {
    ok: attiva ? "Tavolo a formula." : "Tavolo alla carta: paga i piatti.",
  };
}

/**
 * Quanti dei coperti sono bambini.
 *
 * Contati a parte perché entrano nel totale a tariffa ridotta, o non
 * entrano affatto: sommarli agli adulti farebbe pagare a un bambino di
 * quattro anni il prezzo pieno dell'all you can eat.
 */
export async function impostaBambini(
  sessionId: string,
  bambini: number
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireVenue();
  if (!Number.isInteger(bambini) || bambini < 0 || bambini > 50) {
    return { error: "Numero non valido" };
  }

  const sql = db();

  // Mai più dei coperti: due bambini su un tavolo da uno è un dato che
  // renderebbe il conto negativo sugli adulti.
  const righe = await sql<{ guest_count: number; bambini: number }[]>`
    update table_sessions
       set bambini = least(${bambini}, coalesce(guest_count, 1))
     where id = ${sessionId} and venue_id = ${venue.venueId}
       and status <> 'closed'
    returning guest_count, bambini`;

  if (righe.length === 0) return { error: "Tavolo non trovato o già chiuso" };

  revalidatePath("/dashboard");
  return righe[0].bambini < bambini
    ? {
        ok: `Il tavolo ha ${righe[0].guest_count} coperti: segnati ${righe[0].bambini} bambini.`,
      }
    : { ok: "Salvato." };
}

/**
 * Supplemento per l'avanzato.
 *
 * Lo decide una persona guardando il tavolo: nessun programma può sapere
 * quanto è rimasto nel piatto. Si applica una volta, non per commensale, e
 * solo se il locale l'ha dichiarato sul menu prima dell'ordinazione.
 */
export async function applicaSupplemento(
  sessionId: string,
  applica: boolean
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireVenue();
  const sql = db();

  const righe = await sql<{ supplemento_cents: number }[]>`
    update table_sessions ts
       set supplemento_cents = case
             when ${applica}
             then (select formula_supplemento_cents from venues where id = ts.venue_id)
             else 0
           end
     where ts.id = ${sessionId} and ts.venue_id = ${venue.venueId}
       and ts.status <> 'closed'
    returning supplemento_cents`;

  if (righe.length === 0) return { error: "Tavolo non trovato o già chiuso" };

  revalidatePath("/dashboard");
  return {
    ok: righe[0].supplemento_cents > 0
      ? "Supplemento aggiunto al conto."
      : "Supplemento tolto.",
  };
}
