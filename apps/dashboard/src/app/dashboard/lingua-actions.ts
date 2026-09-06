"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import { normalizzaLinguaUI } from "@repo/shared/i18n";

/**
 * Il selettore nella barra, per chiunque abbia fatto l'accesso.
 *
 * Esiste già `salvaLingua` nelle impostazioni, ma richiede il ruolo di
 * titolare o responsabile: un cameriere non può chiamarla. E il selettore in
 * barra serve proprio a lui — è il modo in cui uno che non legge l'italiano
 * si mette il gestionale nella sua lingua senza farsi aiutare.
 *
 * Deve scrivere la colonna e non solo il cookie: `linguaUtente()` dà la
 * precedenza a `users.lingua_ui`, quindi con il solo cookie il selettore
 * smetterebbe di funzionare per chiunque abbia toccato una volta le
 * impostazioni. Cliccare "English" non cambierebbe niente e non ci sarebbe
 * nessun errore a dirlo.
 */
export async function scegliLinguaMia(
  valore: string
): Promise<{ ok: boolean }> {
  const lingua = normalizzaLinguaUI(valore);
  if (!lingua) return { ok: false };

  const { userId } = await requireVenue();
  const sql = db();
  await sql`update users set lingua_ui = ${lingua} where id = ${userId}`;

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
