"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tPrenotazioni } from "@/i18n/prenotazioni";

/** Segna lette le recensioni di questo locale. */
export async function segnaTutteLette(): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireVenue();
  const t = tPrenotazioni(await linguaUtente());
  const sql = db();

  const righe = await sql`
    update reviews set letta_at = now()
     where venue_id = ${venue.venueId} and letta_at is null
    returning id`;

  revalidatePath("/dashboard/recensioni");
  return { ok: t("recensioni.segnate", { n: righe.length }) };
}
