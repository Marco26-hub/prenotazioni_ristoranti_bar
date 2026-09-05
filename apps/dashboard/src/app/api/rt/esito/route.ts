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

  const sql = db();

  // Il venue_id nella condizione, non solo l'id: un agente non deve poter
  // chiudere il documento di un altro locale conoscendone l'identificatore.
  const righe = await sql`
    update fiscal_documents
       set stato = ${corpo.esito},
           numero_documento = ${corpo.numeroDocumento?.slice(0, 60) ?? null},
           rt_matricola = ${corpo.matricola?.slice(0, 60) ?? locale.matricola},
           emesso_at = ${corpo.esito === "emesso" ? sql`now()` : null},
           errore = ${corpo.esito === "errore" ? (corpo.errore ?? "").slice(0, 500) : null}
     where id = ${corpo.id} and venue_id = ${locale.venueId}
    returning id`;

  if (righe.length === 0) {
    return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  }

  if (corpo.esito === "errore") {
    console.error(
      `[rt] documento ${corpo.id} non emesso: ${messaggioErrore(corpo.errore)}`
    );
  }

  return NextResponse.json({ ok: true });
}
