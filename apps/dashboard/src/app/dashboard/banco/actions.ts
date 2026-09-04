"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";

/**
 * Chiama un numero al banco, o lo archivia perché è stato ritirato.
 *
 * Chiamare è un gesto che si fa una volta: chi sta al banco ha bisogno di
 * vedere subito cosa ha già chiamato, o al secondo giro grida due volte lo
 * stesso numero mentre un altro aspetta.
 */
export async function chiamaNumero(
  orderId: string,
  azione: "chiama" | "ritira" | "annulla"
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireVenue();
  const sql = db();

  /*
   * Ogni azione tocca solo la colonna che le compete.
   *
   * Prima "ritirato" veniva azzerato da qualunque altra azione: bastava che
   * qualcuno premesse "chiama" sullo stesso numero — capita, al banco si
   * lavora in due — e l'ordine tornava da consegnare.
   */
  const righe = await sql<{ pickup_number: number | null }[]>`
    update orders
       set pickup_chiamato_at = case
             when ${azione} = 'chiama' then coalesce(pickup_chiamato_at, now())
             when ${azione} = 'annulla' then null
             else pickup_chiamato_at
           end,
           pickup_ritirato_at = case
             when ${azione} = 'ritira' then now()
             when ${azione} = 'annulla' then null
             else pickup_ritirato_at
           end
     where id = ${orderId} and venue_id = ${venue.venueId}
       and pickup_number is not null
    returning pickup_number`;

  if (righe.length === 0) return { error: "Ordine non trovato" };

  revalidatePath("/dashboard/banco");
  const n = righe[0].pickup_number;
  return {
    ok:
      azione === "chiama"
        ? `Numero ${n} chiamato.`
        : azione === "ritira"
          ? `Numero ${n} ritirato.`
          : `Numero ${n} rimesso in attesa.`,
  };
}
