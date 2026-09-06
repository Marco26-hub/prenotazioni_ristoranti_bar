"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tImpostazioni } from "@/i18n/impostazioni";
import { NOME_LINGUA_UI, normalizzaLinguaUI } from "@repo/shared/i18n";

export interface EsitoLingua {
  error?: string;
  success?: string;
}

/**
 * Le due lingue, che non sono la stessa cosa.
 *
 * `users.lingua_ui` è come vede il gestionale chi ha fatto l'accesso: sta
 * sull'utente e non sul locale perché in sala ci lavorano persone diverse, e
 * il cuoco rumeno e la titolare non devono per forza leggere la stessa
 * lingua. Vuota significa "decide il browser", che è il comportamento di chi
 * non ha mai toccato niente.
 *
 * `venues.lingua_predefinita` è invece la lingua con cui si apre la pagina
 * che il cliente guarda al tavolo: vale per tutti i clienti, non ha un
 * "decide il browser" perché il ripiego c'è già — la lingua del telefono
 * batte comunque questa, e questa serve solo a dire da dove si parte quando
 * il telefono non dice niente di utile.
 */
export async function salvaLingua(formData: FormData): Promise<EsitoLingua> {
  const { venue, userId } = await requireRole(["owner", "manager"]);
  const t = tImpostazioni(await linguaUtente());

  const miaGrezza = String(formData.get("linguaUi") ?? "").trim();
  const mia = miaGrezza === "" ? null : normalizzaLinguaUI(miaGrezza);
  if (miaGrezza !== "" && mia === null) {
    return { error: t("lingua.errore.valore") };
  }

  const pubblica = normalizzaLinguaUI(String(formData.get("linguaPubblica") ?? ""));
  if (!pubblica) return { error: t("lingua.errore.valore") };

  const sql = db();
  await sql`update users set lingua_ui = ${mia} where id = ${userId}`;
  await sql`
    update venues set lingua_predefinita = ${pubblica}
     where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  // Riletta dopo l'aggiornamento: la conferma va scritta nella lingua in cui
  // l'utente vedrà la pagina da adesso, non in quella che stava lasciando.
  const tDopo = tImpostazioni(await linguaUtente());
  const nomePubblica = NOME_LINGUA_UI[pubblica];

  return {
    success: mia
      ? tDopo("lingua.ok", {
          mia: NOME_LINGUA_UI[mia],
          pubblica: nomePubblica,
        })
      : tDopo("lingua.ok.auto", { pubblica: nomePubblica }),
  };
}
