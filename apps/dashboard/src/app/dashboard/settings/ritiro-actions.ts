"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tImpostazioni } from "@/i18n/impostazioni";

export interface EsitoRitiro {
  error?: string;
  success?: string;
}

const METODI = ["segnaposto", "cercapersone", "telefono"] as const;

/**
 * Numeri di ritiro e come si avvisa chi aspetta.
 *
 * Al banco senza tavoli il cliente non ha un posto a cui portargli il
 * piatto: ha un numero. I tre modi non si escludono — chi consegna un
 * segnaposto spesso avvisa anche sul telefono, per chi si è seduto fuori.
 */
export async function salvaRitiro(formData: FormData): Promise<EsitoRitiro> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tImpostazioni(await linguaUtente());

  const attivo = formData.get("attivo") === "on";
  const metodi = METODI.filter((m) => formData.get(`metodo-${m}`) === "on");

  /*
   * Consegnare al bancone non è solo dare un numero.
   *
   * Cambia chi paga cosa: al tavolo il conto si condivide, al banco ogni
   * cliente è il proprio. Con un QR solo al bancone e la sessione condivisa,
   * la piadina del secondo finiva sul conto del primo.
   */
  const alBanco = formData.get("alBanco") === "on";

  // Numeri accesi e nessun modo di chiamarli: il cliente riceve un numero e
  // nessuno glielo dice mai. Meglio fermarsi qui che scoprirlo al bancone.
  if (attivo && metodi.length === 0) {
    return { error: t("ritiro.errore.metodi") };
  }

  const sql = db();

  // Spegnendoli, i metodi scelti restano: la sezione si chiude e il modulo
  // non li manda più, ma riaccendendo si ritrovava tutto da rifare.
  if (!attivo) {
    await sql`
      update venues set pickup_numbering_enabled = false,
                        servizio_al_banco = ${alBanco}
       where id = ${venue.venueId}`;
  } else {
    await sql`
      update venues set
        pickup_numbering_enabled = true,
        pickup_metodi = ${metodi},
        servizio_al_banco = ${alBanco}
      where id = ${venue.venueId}`;
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/banco");
  revalidatePath("/dashboard");

  if (!attivo) {
    return { success: t("ritiro.ok.spento") };
  }
  return { success: t("ritiro.ok") };
}
