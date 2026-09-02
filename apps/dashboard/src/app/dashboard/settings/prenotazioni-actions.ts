"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";

export interface EsitoPrenotazioni {
  error?: string;
  success?: string;
}

export async function salvaImpostazioniPrenotazioni(
  formData: FormData
): Promise<EsitoPrenotazioni> {
  const { venue } = await requireRole(["owner", "manager"]);

  const email = String(formData.get("reservationEmail") ?? "").trim() || null;
  if (email && !email.includes("@")) return { error: "Email non valida" };

  const capienzaGrezza = String(formData.get("capacity") ?? "").trim();
  const capienza = capienzaGrezza === "" ? null : Number.parseInt(capienzaGrezza, 10);
  if (capienza !== null && (!Number.isInteger(capienza) || capienza < 1 || capienza > 2000)) {
    return { error: "Capienza non valida" };
  }

  const auto = formData.get("autoConfirm") === "on";

  // Confermare in automatico senza sapere quanti posti ci sono significa
  // accettare qualunque richiesta: è il modo più veloce per ritrovarsi il
  // doppio dei coperti che il locale può servire.
  if (auto && capienza === null) {
    return {
      error: "Per la conferma automatica devi indicare quanti coperti puoi servire.",
    };
  }

  const sql = db();
  await sql`
    update venues set
      reservation_email = ${email},
      reservation_capacity = ${capienza},
      reservation_auto_confirm = ${auto}
    where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/reservations");

  return {
    success: auto
      ? `Salvato. Le richieste fino a ${capienza} coperti per fascia vengono accettate da sole.`
      : "Salvato. Confermerai tu ogni richiesta dal calendario.",
  };
}
