"use server";

import { REPARTI_VALIDI as REPARTI } from "@repo/shared/reparti";
import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue, requireRole } from "@/lib/authz";



/**
 * Lo schermo si presenta.
 *
 * Non è autenticazione — quella resta l'account: è un'etichetta per
 * riconoscere il monitor e poterlo nominare. Senza, dalla dashboard non si
 * poteva sapere quanti schermi fossero accesi, e un titolare che vede "al
 * bar non arrivano le comande" non aveva modo di controllare se il tablet
 * del bar fosse acceso e sul reparto giusto.
 */
export async function segnalaDispositivo(deviceKey: string, reparto: string) {
  const { venue, userId } = await requireVenue();
  if (!deviceKey || deviceKey.length > 64) return;

  const sql = db();
  await sql`
    insert into venue_devices (venue_id, device_key, reparto, ultimo_utente)
    values (${venue.venueId}, ${deviceKey},
            ${REPARTI.includes(reparto) ? reparto : null}, ${userId})
    on conflict (venue_id, device_key) do update
       set reparto = excluded.reparto,
           ultimo_utente = excluded.ultimo_utente,
           last_seen_at = now()`;
}

export async function rinominaDispositivo(
  id: string,
  nome: string
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);
  const pulito = nome.trim().slice(0, 40);

  const sql = db();
  const [row] = await sql<{ id: string }[]>`
    update venue_devices set nome = ${pulito || null}
     where id = ${id} and venue_id = ${venue.venueId}
    returning id`;

  if (!row) return { error: "Dispositivo non trovato" };
  revalidatePath("/dashboard/staff");
  return { ok: pulito ? `Rinominato in "${pulito}".` : "Nome rimosso." };
}

/**
 * Dimentica uno schermo.
 *
 * Non lo disconnette: se è ancora acceso e in uso si ripresenta al prossimo
 * giro. Serve a togliere dall'elenco i dispositivi dismessi, non a fare
 * sicurezza — per quella si toglie l'accesso alla persona.
 */
export async function dimenticaDispositivo(
  id: string
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();
  const [row] = await sql<{ id: string }[]>`
    delete from venue_devices
     where id = ${id} and venue_id = ${venue.venueId}
    returning id`;
  if (!row) return { error: "Dispositivo non trovato" };
  revalidatePath("/dashboard/staff");
  return { ok: "Rimosso dall'elenco. Se è ancora in uso ricomparirà." };
}
