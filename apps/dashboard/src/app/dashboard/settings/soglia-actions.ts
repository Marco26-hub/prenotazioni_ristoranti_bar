"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";

export async function salvaSoglia(
  formData: FormData
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);

  const minuti = Number.parseInt(String(formData.get("soglia") ?? ""), 10);
  if (!Number.isFinite(minuti) || minuti < 0 || minuti > 240) {
    return { error: "Indica un valore fra 0 e 240 minuti" };
  }

  const sql = db();
  await sql`
    update venues set soglia_attesa_min = ${minuti} where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");

  return {
    ok: minuti === 0 ? "Allarme ritardi disattivato." : `Allarme dopo ${minuti} minuti.`,
  };
}
