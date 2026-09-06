"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { encryptSecret } from "@repo/shared/crypto";
import { inviaEmail } from "@repo/shared/email";
import { requireRole } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tImpostazioni } from "@/i18n/impostazioni";

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
  const t = tImpostazioni(await linguaUtente());
  const sql = db();

  if (formData.get("rimuovi") === "on") {
    await sql`
      update venues set resend_api_key = null, resend_from = null
      where id = ${venue.venueId}`;
    revalidatePath("/dashboard/settings");
    return { success: t("email.ok.rimosso") };
  }

  const chiave = String(formData.get("apiKey") ?? "").trim();
  const from = String(formData.get("from") ?? "").trim();

  if (!chiave && !from) return { error: t("email.errore.vuoto") };
  if (!chiave.startsWith("re_")) {
    return { error: t("email.errore.chiave") };
  }
  if (!from.includes("@")) return { error: t("email.errore.mittente") };

  // Provato subito: una chiave sbagliata scoperta alla prima prenotazione
  // vera significa un cliente che non riceve la conferma.
  const prova = await inviaEmail({
    a: from,
    oggetto: t("email.prova.oggetto"),
    testo: t("email.prova.testo"),
    mittenteLocale: { apiKey: chiave, from },
  });

  if (!prova.inviata) {
    return {
      error: t("email.errore.resend", { errore: prova.errore ?? "" }),
    };
  }

  await sql`
    update venues set
      resend_api_key = ${encryptSecret(chiave)},
      resend_from = ${from}
    where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");
  return {
    success: t("email.ok.collegato", { indirizzo: from }),
  };
}
