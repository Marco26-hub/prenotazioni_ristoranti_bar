"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";

export interface EsitoCoperto {
  error?: string;
  success?: string;
}

/**
 * Coperto e servizio.
 *
 * Vanno esposti al cliente insieme ai prezzi dei piatti, non solo in fondo
 * al conto: il R.D. 635/1940 art. 180 li mette alla pari di una voce di
 * menu, e ometterli è sanzionato.
 */
export async function salvaCoperto(formData: FormData): Promise<EsitoCoperto> {
  const { venue } = await requireRole(["owner", "manager"]);

  const copertoEuro = Number.parseFloat(String(formData.get("coperto") ?? "0"));
  const servizio = Number.parseFloat(String(formData.get("servizio") ?? "0"));
  const etichetta = String(formData.get("etichetta") ?? "").trim() || null;

  if (!Number.isFinite(copertoEuro) || copertoEuro < 0 || copertoEuro > 50) {
    return { error: "Coperto non valido (0-50 €)" };
  }
  if (!Number.isFinite(servizio) || servizio < 0 || servizio > 30) {
    return { error: "Servizio non valido (0-30%)" };
  }

  const sql = db();
  await sql`
    update venues set
      cover_charge_cents = ${Math.round(copertoEuro * 100)},
      service_percent = ${servizio},
      cover_charge_label = ${etichetta}
    where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");

  if (copertoEuro === 0 && servizio === 0) {
    return { success: "Salvato. Nessun coperto né servizio: al cliente non compare nulla." };
  }
  return {
    success:
      "Salvato. Compare sul menu del cliente e come voce a parte nel conto.",
  };
}
