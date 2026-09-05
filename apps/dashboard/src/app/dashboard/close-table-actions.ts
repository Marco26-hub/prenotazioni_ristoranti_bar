"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import { contoSessione } from "@repo/shared/conto";
import { accodaDocumento } from "@repo/shared/fiscale";

/**
 * Chiusura del conto da parte dello staff, per il pagamento al banco o in
 * contanti. Senza questo un tavolo che non paga dall'app resterebbe aperto
 * per sempre: la chiusura automatica avviene solo alla conferma del
 * pagamento online.
 *
 * Registra comunque una riga in payments, altrimenti l'incasso di giornata
 * mostrerebbe solo i pagamenti con carta e i conti chiusi a mano
 * sparirebbero dai totali.
 */
export async function closeTableInPerson(
  sessionId: string
): Promise<{ ok?: string; error?: string }> {
  const { venue, userId } = await requireVenue();
  const sql = db();

  let esito: { ok?: string; error?: string } = {};

  await sql.begin(async (tx) => {
    const [session] = await tx<{ id: string; venue_id: string; status: string }[]>`
      select id, venue_id, status from table_sessions
      where id = ${sessionId} and venue_id = ${venue.venueId}
      for update`;

    if (!session) {
      esito = { error: "Tavolo non trovato" };
      return;
    }
    if (session.status === "closed") {
      esito = { ok: "Il conto era già chiuso." };
      return;
    }

    /*
     * Non si incassa al banco mentre una carta sta pagando.
     *
     * Il totale già pagato conta le sole righe riuscite, quindi un pagamento
     * ancora in corso valeva zero: si registrava l'intero conto in contanti e
     * pochi secondi dopo la carta andava a buon fine. Il tavolo pagava due
     * volte e l'eccedenza non si vedeva, perché il saldo negativo viene
     * azzerato. Succede davvero — il cliente è lento sull'autorizzazione e
     * intanto dice "faccio in contanti".
     */
    const [inCorso] = await tx<{ n: string }[]>`
      select count(*)::text as n from payments
       where table_session_id = ${session.id} and status = 'pending'`;

    if (Number(inCorso?.n ?? 0) > 0) {
      esito = {
        error:
          "C'è un pagamento con carta in corso su questo tavolo. Aspetta l'esito prima di incassare al banco: rischi di far pagare due volte.",
      };
      return;
    }

    /*
     * Lo stesso conto che vede il cliente, calcolato dalla stessa funzione.
     *
     * Prima l'aritmetica era riscritta qui dentro, e con la formula le due
     * copie hanno smesso di coincidere: il servizio si calcolava su basi
     * diverse a seconda che si pagasse dall'app o in contanti, e sullo
     * stesso ordine ballavano diciotto euro. Ora la transazione chiama la
     * funzione condivisa passandole il proprio gestore, così legge gli
     * stessi dati che sta per scrivere.
     */
    const conto = await contoSessione(tx, session.id);
    const remaining = conto.residuoCents > 0 ? conto.residuoCents : -conto.eccedenzaCents;

    if (remaining < 0) {
      // Il tavolo ha versato più del dovuto. Chiudere in silenzio lo
      // nasconderebbe: da qui in poi il saldo è azzerato e non lo trova più
      // nessuno. Il conto si chiude — non si può tenere occupato un tavolo
      // per questo — ma chi ha premuto deve saperlo subito.
      esito = {
        ok: `Conto chiuso, ma il tavolo ha pagato ${(Math.abs(remaining) / 100).toFixed(2)} € in più: verifica se serve un rimborso.`,
      };
    }

    if (remaining > 0) {
      await tx`
        insert into payments (
          venue_id, table_session_id, amount_cents, method, provider,
          split_type, status, paid_by_label
        ) values (
          ${session.venue_id}, ${session.id}, ${remaining}, 'cash', 'manual',
          'full', 'succeeded', 'Incassato al banco'
        )`;
    }

    await tx`
      update table_sessions set status = 'closed', closed_at = now()
      where id = ${session.id}`;

    /*
     * Il documento commerciale si accoda alla chiusura, non prima.
     *
     * Finché il tavolo è aperto il conto cambia, e un documento emesso a
     * metà pasto sarebbe un corrispettivo da stornare. Sta dentro la
     * transazione perché o si chiude e si certifica, o non si fa né l'uno
     * né l'altro: un conto chiuso senza il suo documento è un incasso che
     * non risulta.
     */
    await accodaDocumento(tx, session.id);

    // Chiudendo il conto la chiamata è per definizione soddisfatta: qualcuno
    // è andato al tavolo, ha incassato e ha portato il documento. Lasciarla
    // aperta la farebbe suonare su un tavolo ormai vuoto.
    await tx`
      update table_calls set handled_at = now(), handled_by = ${userId}
       where table_session_id = ${session.id} and handled_at is null`;
  });

  /*
   * Si ricarica solo se qualcosa è cambiato.
   *
   * Sul rifiuto la revalidate rimontava la sala e cancellava l'avviso appena
   * mostrato: il cameriere vedeva la pagina sfarfallare, nessun messaggio, e
   * il tavolo ancora aperto — cioè esattamente la situazione in cui si
   * riprova, che è quello che il rifiuto serviva a evitare.
   */
  if (!esito.error) revalidatePath("/dashboard");
  return esito.error || esito.ok ? esito : { ok: "Conto chiuso." };
}
