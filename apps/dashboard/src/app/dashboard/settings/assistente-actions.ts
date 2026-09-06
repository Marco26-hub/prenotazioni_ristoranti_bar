"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tImpostazioni } from "@/i18n/impostazioni";

export interface EsitoAssistente {
  error?: string;
  success?: string;
}

/**
 * Orari, informazioni pratiche e assistente.
 *
 * L'assistente resta spento finché non lo accende il locale: ogni domanda
 * di un cliente è una chiamata al modello addebitata sul suo account
 * OpenRouter. Accenderlo di default significherebbe spendere i soldi di
 * qualcun altro senza chiederglielo.
 */
export async function salvaAssistente(formData: FormData): Promise<EsitoAssistente> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tImpostazioni(await linguaUtente());

  const orari = String(formData.get("orari") ?? "").trim().slice(0, 600) || null;
  const info = String(formData.get("info") ?? "").trim().slice(0, 800) || null;
  const attivo = formData.get("assistente") === "on";

  const sql = db();

  if (attivo) {
    const [v] = await sql<{ openrouter_api_key: string | null }[]>`
      select openrouter_api_key from venues where id = ${venue.venueId}`;
    if (!v?.openrouter_api_key) {
      return { error: t("assistente.errore.chiave") };
    }
    if (!orari) {
      // "A che ora aprite?" è la prima domanda che riceverà: senza orari
      // l'assistente farebbe una figura peggiore del silenzio.
      return { error: t("assistente.errore.orari") };
    }
  }

  await sql`
    update venues set
      opening_hours = ${orari},
      practical_info = ${info},
      assistant_enabled = ${attivo}
    where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");

  return {
    success: attivo ? t("assistente.ok.acceso") : t("assistente.ok.spento"),
  };
}
