"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { encryptSecret } from "@repo/shared/crypto";
import { inviaEmail } from "@repo/shared/email";
import { requireRole } from "@/lib/authz";

export interface EsitoEmailLocale {
  error?: string;
  success?: string;
}

/**
 * Mittente proprio del locale.
 *
 * Facoltativo: senza, le email partono dal mittente della piattaforma. Serve
 * a chi vuole che le conferme arrivino dal proprio dominio — è il senso del
 * white label — ed è l'unico punto del prodotto che chiede di toccare i DNS.
 */
export async function salvaMittenteEmail(
  formData: FormData
): Promise<EsitoEmailLocale> {
  const { venue } = await requireRole(["owner"]);
  const sql = db();

  if (formData.get("rimuovi") === "on") {
    await sql`
      update venues set resend_api_key = null, resend_from = null
      where id = ${venue.venueId}`;
    revalidatePath("/dashboard/settings");
    return { success: "Rimosso. Le email tornano a partire dal nostro mittente." };
  }

  const chiave = String(formData.get("apiKey") ?? "").trim();
  const from = String(formData.get("from") ?? "").trim();

  if (!chiave && !from) return { error: "Inserisci chiave e mittente, o non cambiare nulla" };
  if (!chiave.startsWith("re_")) {
    return { error: "La chiave Resend inizia per re_" };
  }
  if (!from.includes("@")) return { error: "Il mittente deve essere un indirizzo email" };

  // Provato subito: una chiave sbagliata scoperta alla prima prenotazione
  // vera significa un cliente che non riceve la conferma.
  const prova = await inviaEmail({
    a: from,
    oggetto: "Prova di invio — gestionale",
    testo:
      "Se leggi questo messaggio, il mittente del tuo locale è configurato " +
      "correttamente. Le conferme di prenotazione partiranno da qui.",
    mittenteLocale: { apiKey: chiave, from },
  });

  if (!prova.inviata) {
    return {
      error: `Resend ha rifiutato l'invio: ${prova.errore}. Controlla che il dominio del mittente sia verificato.`,
    };
  }

  await sql`
    update venues set
      resend_api_key = ${encryptSecret(chiave)},
      resend_from = ${from}
    where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");
  return {
    success: `Collegato. Abbiamo mandato una prova a ${from}: controlla che sia arrivata.`,
  };
}
