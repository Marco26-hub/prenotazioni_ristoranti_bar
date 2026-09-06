"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tImpostazioni } from "@/i18n/impostazioni";

/**
 * Dopo quante ore un tavolo aperto smette di essere lo stesso tavolo.
 *
 * La colonna esisteva già, con sei ore fisse e nessun modo di cambiarle: era
 * una decisione presa da noi per tutti. Sei ore vanno bene a una trattoria e
 * sono sbagliate per un all you can eat a due turni — chi si siede alle 21:30
 * inquadra il QR e si attacca alla sessione delle 19:00 se quella non è stata
 * chiusa, e a prezzo fisso vuol dire dodici persone su una formula sola.
 *
 * Sotto la distanza fra i due turni, il secondo trova un tavolo pulito.
 * Il conto vecchio non si perde: resta a storico e in sala, così il locale
 * può ancora incassarlo se qualcuno era uscito senza pagare.
 */
export async function salvaSessione(
  formData: FormData
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tImpostazioni(await linguaUtente());

  const ore = Number.parseInt(String(formData.get("sessioneOre") ?? ""), 10);
  if (!Number.isFinite(ore) || ore < 0 || ore > 24) {
    return { error: t("sessione.errore") };
  }

  const sql = db();
  await sql`
    update venues set sessione_max_ore = ${ore} where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  return {
    ok: ore === 0 ? t("sessione.ok.mai") : t("sessione.ok", { n: ore }),
  };
}
