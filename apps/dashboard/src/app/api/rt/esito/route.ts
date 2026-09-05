import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { localeDalToken } from "@/lib/rt-auth";
import { messaggioErrore } from "@repo/shared/errori";

/**
 * L'agente racconta com'è andata.
 *
 * Un documento emesso porta con sé il numero che la stampante gli ha dato:
 * senza, non si può più ricollegare un incasso al suo scontrino, che è
 * esattamente quello che serve quando arriva un controllo.
 */
interface Corpo {
  id?: string;
  esito?: "emesso" | "errore";
  numeroDocumento?: string;
  matricola?: string;
  errore?: string;
}

export async function POST(request: Request) {
  const locale = await localeDalToken(request);
  if (!locale) {
    return NextResponse.json({ error: "Non riconosciuto" }, { status: 401 });
  }

  const corpo = (await request.json().catch(() => null)) as Corpo | null;
  if (!corpo?.id || (corpo.esito !== "emesso" && corpo.esito !== "errore")) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  /*
   * Un documento emesso senza numero non si ricollega più al suo scontrino.
   *
   * È esattamente il dato che serve quando arriva un controllo, e alcune
   * stampanti rispondono senza. Si accetta comunque — lo scontrino è
   * uscito, negarlo lo farebbe ristampare — ma va scritto nel campo errore,
   * così la pagina lo mostra e qualcuno può recuperarlo dal registratore.
   */
  const senzaNumero =
    corpo.esito === "emesso" && !corpo.numeroDocumento?.trim();

  const sql = db();

  /*
   * Si chiude solo quello che è ancora aperto.
   *
   * Senza la condizione sullo stato, un esito in ritardo — l'agente che
   * riprova dopo che il ristoratore ha già segnato il documento battuto a
   * mano, o un 'errore' che arriva dopo un 'emesso' — riscriveva un
   * documento chiuso, ne cancellava il numero e lo rimetteva in coda. Da lì
   * usciva una seconda volta: lo stesso incasso dichiarato due volte.
   *
   * Il venue_id nella condizione, non solo l'id: un agente non deve poter
   * chiudere il documento di un altro locale conoscendone l'identificatore.
   */
  const righe = await sql`
    update fiscal_documents
       set stato = ${corpo.esito},
           numero_documento = ${corpo.numeroDocumento?.slice(0, 60) ?? null},
           rt_matricola = ${corpo.matricola?.slice(0, 60) ?? locale.matricola},
           emesso_at = ${corpo.esito === "emesso" ? sql`now()` : null},
           errore = ${
             corpo.esito === "errore"
               ? (corpo.errore ?? "").slice(0, 500)
               : senzaNumero
                 ? "Emesso, ma la stampante non ha restituito il numero: recuperalo dal registratore."
                 : null
           }
     where id = ${corpo.id} and venue_id = ${locale.venueId}
       and stato in ('in_corso', 'da_emettere', 'errore')
    returning id`;

  if (righe.length === 0) {
    /*
     * Può essere già chiuso, e allora non è un errore: l'agente sta
     * riprovando un esito che era arrivato. Si risponde 200, o continuerebbe
     * a riprovare per sempre.
     */
    const [gia] = await sql<{ stato: string }[]>`
      select stato from fiscal_documents
       where id = ${corpo.id} and venue_id = ${locale.venueId}`;

    if (gia) {
      return NextResponse.json({ ok: true, gia: gia.stato });
    }
    return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  }

  if (corpo.esito === "errore") {
    console.error(
      `[rt] documento ${corpo.id} non emesso: ${messaggioErrore(corpo.errore)}`
    );
  }

  return NextResponse.json({ ok: true });
}
