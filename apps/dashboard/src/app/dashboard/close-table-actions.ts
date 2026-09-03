"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";

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
     * Stessa aritmetica del conto mostrato al cliente.
     *
     * Sta scritta due volte perché qui vive dentro la transazione che chiude
     * il tavolo, ma i due numeri devono coincidere: se il conto allo staff
     * fosse più basso, il tavolo non si chiuderebbe mai per una differenza
     * di due euro, e se fosse più alto si incasserebbe di più di quanto
     * dichiarato al cliente.
     *
     * A formula i piatti compresi valgono zero: si pagano solo dolci,
     * caffè, amari, bevande e piatti premium.
     */
    const [f] = await tx<
      {
        formula: boolean;
        guest_count: number;
        bambini: number;
        supplemento_cents: number;
        formula_attiva: boolean;
        unitario: number;
        bambino: number | null;
      }[]
    >`select ts.formula, ts.guest_count, ts.bambini, ts.supplemento_cents,
             v.formula_attiva,
             case
               when (ts.opened_at at time zone coalesce(v.timezone, 'Europe/Rome'))::time
                    >= v.formula_ora_cena
               then v.formula_cena_cents else v.formula_pranzo_cents
             end as unitario,
             v.formula_bambino_cents as bambino
        from table_sessions ts
        join venues v on v.id = ts.venue_id
       where ts.id = ${session.id}`;

    const aFormula = Boolean(f?.formula && f.formula_attiva && (f.unitario ?? 0) > 0);

    const [ordered] = await tx<{ total: string | null }[]>`
      select sum(oi.quantity * oi.unit_price_cents) as total
      from order_items oi
      join orders o on o.id = oi.order_id
      join menu_items mi on mi.id = oi.menu_item_id
      where o.table_session_id = ${session.id}
        and o.status != 'cancelled' and oi.status != 'cancelled'
        and (${!aFormula} or mi.fuori_formula)`;

    const [paid] = await tx<{ total: string | null }[]>`
      select sum(amount_cents) as total from payments
      where table_session_id = ${session.id} and status = 'succeeded'`;

    const ordinato = Number(ordered?.total ?? 0);

    const coperti = Math.max(f?.guest_count ?? 1, 0);
    const bambini = Math.min(Math.max(f?.bambini ?? 0, 0), coperti);
    const formulaCents = aFormula
      ? (coperti - bambini) * f.unitario +
        bambini * (f.bambino ?? f.unitario) +
        (f.supplemento_cents ?? 0)
      : 0;

    // Il tavolo deve aver ordinato qualcosa: un QR inquadrato per curiosità
    // non apre un debito di quaranta euro.
    const [quante] = await tx<{ n: string }[]>`
      select count(*)::text as n
        from order_items oi
        join orders o on o.id = oi.order_id
       where o.table_session_id = ${session.id}
         and o.status != 'cancelled' and oi.status != 'cancelled'`;
    const haOrdinato = Number(quante?.n ?? 0) > 0;

    // Coperto e servizio come li calcola l'app cliente: se qui mancassero,
    // il conto chiuso allo staff sarebbe più basso di quello mostrato al
    // tavolo e la cassa non tornerebbe.
    const [supp] = await tx<
      {
        guest_count: number;
        cover_charge_cents: number;
        service_percent: string;
      }[]
    >`select ts.guest_count, v.cover_charge_cents, v.service_percent
        from table_sessions ts
        join venues v on v.id = ts.venue_id
       where ts.id = ${session.id}`;

    const supplementi = haOrdinato
      ? (supp?.cover_charge_cents ?? 0) * (supp?.guest_count ?? 1) +
        Math.round((ordinato * Number(supp?.service_percent ?? 0)) / 100)
      : 0;

    const remaining =
      ordinato +
      (haOrdinato ? formulaCents : 0) +
      supplementi -
      Number(paid?.total ?? 0);

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
