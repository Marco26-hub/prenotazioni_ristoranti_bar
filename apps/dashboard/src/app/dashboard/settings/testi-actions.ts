"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { TESTI_PUBBLICI, normalizzaTesti } from "@repo/shared/testi";

export async function salvaTestiPubblici(
  formData: FormData
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);

  const grezzi: Record<string, string> = {};
  for (const slot of TESTI_PUBBLICI) {
    grezzi[slot.chiave] = String(formData.get(slot.chiave) ?? "");
  }

  const testi = normalizzaTesti(grezzi);

  const sql = db();
  const [row] = await sql<{ slug: string }[]>`
    update venues set public_texts = ${sql.json(testi)}
     where id = ${venue.venueId}
    returning slug`;

  if (!row) return { error: "Locale non trovato" };

  // Le pagine pubbliche sono statiche fino al prossimo rebuild: senza questo
  // il ristoratore salva, va a vedere e trova ancora il testo vecchio.
  revalidatePath("/dashboard/settings");
  revalidatePath(`/p/${row.slug}`);
  revalidatePath(`/m/${row.slug}`);

  return { ok: "Testi salvati." };
}
