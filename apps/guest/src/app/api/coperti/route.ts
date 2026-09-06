import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";
import { tApi, linguaRichiesta } from "@/i18n/api";

/**
 * In quanti sono a tavolo, secondo il tavolo.
 *
 * A prezzo fisso il conto è coperti × prezzo, e la sessione la apre il
 * cliente inquadrando il QR: nasce a un coperto e nessuno l'ha dichiarato.
 * Finché resta così, chi mangia non vede un totale e la sala deve ricordarsi
 * di contare le teste. Chiederlo a chi è seduto risolve tutte e due le cose
 * con una domanda sola.
 *
 * È una PROPOSTA. Scrive `guest_count` e segna che l'ha detto il tavolo, ma
 * NON tocca `coperti_confermati`: quello resta il gesto del personale, ed è
 * quello che sblocca il pagamento con carta. Un tavolo da sei che ne dichiara
 * quattro risparmia cinquantadue euro, e nessun programma può accorgersene —
 * la decisione sui soldi resta al locale.
 */
export async function POST(request: Request) {
  const t = tApi(linguaRichiesta(request));

  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    coperti?: number;
  } | null;

  const sessionId = body?.sessionId;
  if (!sessionId) {
    return NextResponse.json({ error: t("errore.sessione_id_mancante") }, { status: 400 });
  }

  /*
   * Per sessione e non per solo indirizzo: al tavolo il wi-fi è uno per
   * tutti, e questa la si tocca una volta a testa mentre ci si siede.
   */
  const { allowed } = await checkRateLimit(
    clientKey(request, `coperti:${sessionId.slice(0, 60)}`),
    20,
    60
  );
  if (!allowed) {
    return NextResponse.json({ error: t("errore.troppe_richieste") }, { status: 429 });
  }

  const coperti = Number(body?.coperti);
  // Il limite alto è quello della sala, non un numero tondo: sopra i
  // cinquanta non è più un tavolo, è un errore di battitura.
  if (!Number.isInteger(coperti) || coperti < 1 || coperti > 50) {
    return NextResponse.json({ error: t("coperti.errore.numero") }, { status: 400 });
  }

  const sql = db();

  /*
   * Si scrive solo su un tavolo aperto, a formula, e che non abbia già la
   * conferma della sala.
   *
   * L'ultima condizione è la più importante: senza, chiunque conosca l'id
   * della sessione potrebbe riabbassare a uno un tavolo che il personale
   * aveva già confermato a sei — e siccome la conferma resterebbe valida,
   * quel conto si potrebbe anche pagare.
   */
  const righe = await sql<{ id: string }[]>`
    update table_sessions ts
       set guest_count = ${coperti},
           bambini = least(ts.bambini, ${coperti}),
           coperti_dal_tavolo = true
      from venues v
     where v.id = ts.venue_id
       and ts.id = ${sessionId}
       and ts.status = 'open'
       and ts.formula
       and v.formula_attiva
       and not ts.coperti_confermati
    returning ts.id`;

  if (righe.length === 0) {
    // Non si distingue il perché di proposito: una sessione chiusa, un
    // tavolo alla carta e una conferma già data sono tre cose diverse, ma
    // per chi è al tavolo la risposta utile è una sola.
    return NextResponse.json({ error: t("coperti.errore.non_possibile") }, { status: 409 });
  }

  return NextResponse.json({ ok: true, coperti });
}
