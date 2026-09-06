"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tImpostazioni } from "@/i18n/impostazioni";

export async function salvaSoglia(
  formData: FormData
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tImpostazioni(await linguaUtente());

  const minuti = Number.parseInt(String(formData.get("soglia") ?? ""), 10);
  const liberazione = Number.parseInt(String(formData.get("liberazione") ?? ""), 10);

  if (!Number.isFinite(minuti) || minuti < 0 || minuti > 240) {
    return { error: t("soglia.errore.ritardo") };
  }
  if (!Number.isFinite(liberazione) || liberazione < 0 || liberazione > 240) {
    return { error: t("soglia.errore.recupero") };
  }

  const sql = db();
  await sql`
    update venues set soglia_attesa_min = ${minuti},
                      soglia_liberazione_min = ${liberazione}
     where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");

  return {
    ok: t("soglia.ok", {
      ritardi:
        minuti === 0
          ? t("soglia.ok.ritardi_spenti")
          : t("soglia.ok.dopo_min", { n: minuti }),
      recupero:
        liberazione === 0
          ? t("soglia.ok.recupero_spento")
          : t("soglia.ok.dopo_min", { n: liberazione }),
    }),
  };
}
