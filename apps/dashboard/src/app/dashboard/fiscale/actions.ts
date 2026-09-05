"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { improntaAgente } from "@/lib/rt-auth";

export interface EsitoFiscale {
  error?: string;
  ok?: string;
  /** Mostrato una volta sola: non lo salviamo in chiaro da nessuna parte. */
  segreto?: string;
}

/**
 * Collegamento al registratore telematico.
 *
 * "manuale" non è una funzione a metà: è la verità detta bene. Il locale che
 * non installa niente batte i documenti sulla sua cassa come ha sempre
 * fatto, e il gestionale gli prepara il riepilogo invece di fingere che sia
 * fatto — che sarebbe il modo di far credere a qualcuno di essere in regola
 * quando non lo è.
 */
export async function salvaRt(formData: FormData): Promise<EsitoFiscale> {
  const { venue } = await requireRole(["owner", "manager"]);

  const attivo = formData.get("attivo") === "on";
  const modalita = formData.get("modalita") === "agente" ? "agente" : "manuale";
  const matricola = String(formData.get("matricola") ?? "").trim().slice(0, 60);

  if (attivo && !matricola) {
    return {
      error:
        "Serve la matricola del registratore: è quella che hai comunicato all'Agenzia.",
    };
  }

  const sql = db();
  await sql`
    update venues set
      rt_attivo = ${attivo},
      rt_modalita = ${modalita},
      rt_matricola = ${matricola || null}
    where id = ${venue.venueId}`;

  revalidatePath("/dashboard/fiscale");

  if (!attivo) {
    return { ok: "Spento: i conti chiusi non vengono messi in coda." };
  }
  return {
    ok:
      modalita === "agente"
        ? "Salvato. Genera il codice per il programma sulla cassa, qui sotto."
        : "Salvato. I documenti restano da battere a mano e trovi il riepilogo qui.",
  };
}

/**
 * Genera il segreto che l'agente userà per riconoscersi.
 *
 * Si vede una volta sola: qui resta solo l'impronta. Generarne uno nuovo
 * spegne il precedente, che è il modo di togliere l'accesso a un computer
 * che non c'è più.
 */
export async function generaCodiceAgente(): Promise<EsitoFiscale> {
  const { venue } = await requireRole(["owner", "manager"]);

  const segreto = randomBytes(32).toString("base64url");
  const sql = db();
  await sql`
    update venues set rt_agente_hash = ${improntaAgente(segreto)},
                      rt_agente_visto_at = null
     where id = ${venue.venueId}`;

  revalidatePath("/dashboard/fiscale");
  return {
    segreto,
    ok: "Copialo adesso: non si può rivedere. Il precedente non vale più.",
  };
}

/**
 * Il ristoratore dichiara di averlo battuto sulla sua cassa.
 *
 * Serve a chi lavora in manuale e a chi ha avuto un guasto: un documento che
 * resta "da emettere" per sempre confonde il riepilogo dei corrispettivi, e
 * la persona che l'ha battuto sa che l'ha battuto.
 */
export async function segnaBattuto(
  id: string,
  numero: string
): Promise<EsitoFiscale> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const righe = await sql`
    update fiscal_documents
       set stato = 'battuto_a_mano',
           numero_documento = ${numero.trim().slice(0, 60) || null},
           emesso_at = now(), errore = null
     where id = ${id} and venue_id = ${venue.venueId}
       and stato <> 'emesso'
    returning id`;

  if (righe.length === 0) {
    return { error: "Documento non trovato, o già emesso dal registratore" };
  }

  revalidatePath("/dashboard/fiscale");
  return { ok: "Segnato come battuto in cassa." };
}
