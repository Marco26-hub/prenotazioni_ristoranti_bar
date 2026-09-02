"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { DPA_VERSION } from "@/lib/dpa";

/**
 * Registra l'accettazione della nomina a responsabile del trattamento.
 *
 * Solo il titolare può accettarla: è un impegno contrattuale sul trattamento
 * dei dati dell'attività, non un'impostazione operativa che possa prendere
 * chi è in sala.
 */
export async function accettaDpa(): Promise<{ error?: string } | void> {
  const { venue } = await requireRole(["owner"]);
  const sql = db();

  await sql`
    update venues
       set dpa_accepted_at = now(), dpa_version = ${DPA_VERSION}
     where id = ${venue.venueId}`;

  revalidatePath("/dashboard", "layout");
}
