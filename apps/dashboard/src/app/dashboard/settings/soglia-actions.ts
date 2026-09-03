"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";

export async function salvaSoglia(
  formData: FormData
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);

  const minuti = Number.parseInt(String(formData.get("soglia") ?? ""), 10);
  const liberazione = Number.parseInt(String(formData.get("liberazione") ?? ""), 10);

  if (!Number.isFinite(minuti) || minuti < 0 || minuti > 240) {
    return { error: "Indica un valore fra 0 e 240 minuti per i ritardi" };
  }
  if (!Number.isFinite(liberazione) || liberazione < 0 || liberazione > 240) {
    return { error: "Indica un valore fra 0 e 240 minuti per il recupero tavolo" };
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
    ok: `Ritardi ${minuti === 0 ? "spenti" : `dopo ${minuti} min`}, recupero tavolo ${liberazione === 0 ? "spento" : `dopo ${liberazione} min`}.`,
  };
}
