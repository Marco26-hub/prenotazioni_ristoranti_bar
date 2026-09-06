"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import { tSala } from "@/i18n/sala";
import { linguaUtente } from "@/lib/lingua";

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
  const t = tSala(await linguaUtente());

  if (!Number.isInteger(coperti) || coperti < 1 || coperti > 50) {
    return { error: t("azioni.coperti_non_validi") };
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
           bambini = least(bambini, ${coperti}),
           -- Dichiarati. A prezzo fisso è la differenza fra un conto e un
           -- numero inventato: la sessione nasce a un coperto perché la apre
           -- il cliente col QR, e "uno" è anche un tavolo vero. Solo quando
           -- qualcuno del personale li scrive diventano un dato.
           coperti_confermati = true
     where id = ${sessionId} and venue_id = ${venue.venueId}
       and status <> 'closed'
    returning id`;

  if (righe.length === 0) return { error: t("azioni.tavolo_non_valido") };

  revalidatePath("/dashboard");
  return { ok: t("azioni.coperti_ok") };
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
  const t = tSala(await linguaUtente());
  const sql = db();

  const righe = await sql`
    update table_sessions set formula = ${attiva}
     where id = ${sessionId} and venue_id = ${venue.venueId}
       and status <> 'closed'
    returning id`;

  if (righe.length === 0) return { error: t("azioni.tavolo_non_valido") };

  revalidatePath("/dashboard");
  return {
    ok: attiva ? t("azioni.formula_on") : t("azioni.formula_off"),
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
  const t = tSala(await linguaUtente());
  if (!Number.isInteger(bambini) || bambini < 0 || bambini > 50) {
    return { error: t("azioni.numero_non_valido") };
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

  if (righe.length === 0) return { error: t("azioni.tavolo_non_valido") };

  revalidatePath("/dashboard");
  return righe[0].bambini < bambini
    ? {
        ok: t("azioni.bambini_limitati", {
          coperti: righe[0].guest_count,
          bambini: righe[0].bambini,
        }),
      }
    : { ok: t("azioni.salvato") };
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
  const t = tSala(await linguaUtente());
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

  if (righe.length === 0) return { error: t("azioni.tavolo_non_valido") };

  revalidatePath("/dashboard");
  return {
    ok: righe[0].supplemento_cents > 0
      ? t("azioni.supplemento_on")
      : t("azioni.supplemento_off"),
  };
}

/**
 * Pranzo o cena, deciso a mano.
 *
 * Il prezzo della formula lo sceglie l'ora in cui il tavolo si è seduto, ed è
 * la regola giusta quasi sempre. Quasi: il tavolo delle 18:30 in un locale
 * che apre la cena alle 19 pagava il pranzo per tutta la sera, e non c'era
 * modo di correggerlo. Su quattro persone, con dieci euro di differenza fra
 * le due fasce, sono quaranta euro a tavolo.
 *
 * `null` rimette la decisione all'orario, che resta il predefinito.
 */
export async function impostaFascia(
  sessionId: string,
  fascia: "pranzo" | "cena" | null
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireVenue();
  const t = tSala(await linguaUtente());

  if (fascia !== null && fascia !== "pranzo" && fascia !== "cena") {
    return { error: t("azioni.fascia_non_valida") };
  }

  const sql = db();
  const righe = await sql`
    update table_sessions set fascia = ${fascia}
     where id = ${sessionId} and venue_id = ${venue.venueId}
       and status <> 'closed'
    returning id`;

  if (righe.length === 0) return { error: t("azioni.tavolo_non_valido") };

  revalidatePath("/dashboard");
  return {
    ok:
      fascia === null
        ? t("azioni.fascia_auto")
        : t("azioni.fascia_ok", { fascia: t(`formula.${fascia}`) }),
  };
}

/**
 * Accetta i coperti che ha dichiarato il tavolo.
 *
 * Non cambia il numero: lo conferma. Il gesto esiste separato da
 * `impostaCoperti` perché è quello che si fa novantanove volte su cento —
 * si passa, si guarda il tavolo, il numero è giusto, si tocca. Doverlo
 * ribattere ogni volta significherebbe che nessuno lo tocca, e il tavolo
 * resterebbe senza conferma fino al conto.
 */
export async function accettaCopertiDelTavolo(
  sessionId: string
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireVenue();
  const t = tSala(await linguaUtente());

  const sql = db();
  const righe = await sql<{ guest_count: number }[]>`
    update table_sessions
       set coperti_confermati = true
     where id = ${sessionId} and venue_id = ${venue.venueId}
       and status <> 'closed'
       -- Solo se il numero l'ha davvero detto il tavolo: confermare alla
       -- cieca un tavolo che non ha dichiarato niente vorrebbe dire
       -- accettare l'uno di partenza, che è il conto sbagliato.
       and coperti_dal_tavolo
    returning guest_count`;

  if (righe.length === 0) return { error: t("azioni.tavolo_non_valido") };

  revalidatePath("/dashboard");
  return { ok: t("azioni.coperti_accettati", { n: righe[0].guest_count }) };
}
