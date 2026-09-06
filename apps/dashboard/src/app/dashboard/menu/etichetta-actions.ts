"use server";

import { db } from "@repo/shared/db";
import { decryptSecret, encryptSecret } from "@repo/shared/crypto";
import { leggiEtichetta, MODELLO_PREDEFINITO, type SchedaVino } from "@repo/shared/openrouter";
import { requireRole } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { linguaUtente } from "@/lib/lingua";
import { tMenuAdmin } from "@/i18n/menu";

export interface EsitoEtichetta {
  error?: string;
  scheda?: SchedaVino;
  avviso?: string;
}

/** Le etichette si fotografano col telefono: il limite è più alto di un piatto. */
const MAX_BYTES = 800 * 1024;
const TIPI = ["image/jpeg", "image/png", "image/webp"];

/**
 * Legge un'etichetta e propone la scheda.
 *
 * Non salva niente: restituisce una proposta che il ristoratore vede,
 * corregge e conferma. Ciò che finisce in carta è un'affermazione
 * commerciale, e un'annata inventata dal modello sarebbe un dato falso
 * davanti al cliente.
 */
export async function leggiDaFoto(formData: FormData): Promise<EsitoEtichetta> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tMenuAdmin(await linguaUtente());

  const file = formData.get("etichetta");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t("etichetta.errore.nessuna.foto") };
  }
  if (!TIPI.includes(file.type)) {
    return { error: t("etichetta.errore.formato") };
  }
  if (file.size > MAX_BYTES) {
    return { error: t("etichetta.errore.peso") };
  }

  const sql = db();
  const [v] = await sql<{ openrouter_api_key: string | null; openrouter_model: string | null }[]>`
    select openrouter_api_key, openrouter_model
      from venues where id = ${venue.venueId}`;

  if (!v?.openrouter_api_key) {
    return { error: t("etichetta.errore.non.attiva") };
  }

  let chiave: string;
  try {
    chiave = decryptSecret(v.openrouter_api_key);
  } catch {
    return { error: t("etichetta.errore.chiave") };
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const esito = await leggiEtichetta(
    `data:${file.type};base64,${base64}`,
    chiave,
    v.openrouter_model ?? MODELLO_PREDEFINITO
  );

  if (esito.errore) return { error: esito.errore };

  const scheda = esito.scheda ?? {};
  const letti = Object.entries(scheda).filter(
    ([k, val]) => k !== "incerti" && val !== undefined
  ).length;

  if (letti === 0) {
    return { error: t("etichetta.errore.niente") };
  }

  return {
    scheda,
    avviso:
      scheda.incerti && scheda.incerti.length > 0
        ? t("etichetta.avviso.incerti", { campi: scheda.incerti.join(", ") })
        : t("etichetta.avviso.rileggi"),
  };
}

export interface EsitoChiave {
  error?: string;
  success?: string;
}

export async function salvaChiaveOpenRouter(formData: FormData): Promise<EsitoChiave> {
  const { venue } = await requireRole(["owner"]);
  const t = tMenuAdmin(await linguaUtente());
  const sql = db();

  if (formData.get("rimuovi") === "on") {
    await sql`
      update venues set openrouter_api_key = null, openrouter_model = null
       where id = ${venue.venueId}`;
    revalidatePath("/dashboard/settings");
    return { success: t("chiave.rimossa") };
  }

  const chiave = String(formData.get("apiKey") ?? "").trim();
  const modello = String(formData.get("model") ?? "").trim() || MODELLO_PREDEFINITO;

  // Il campo chiave non viene mai ripopolato — è un segreto, e ristamparlo
  // in pagina sarebbe peggio. Ma se resta vuoto e una chiave c'è già, chi
  // voleva solo cambiare modello si sentiva rispondere che la chiave è
  // sbagliata, e non aveva modo di cambiarlo se non reinserendola.
  if (!chiave) {
    const [attuale] = await sql<{ openrouter_api_key: string | null }[]>`
      select openrouter_api_key from venues where id = ${venue.venueId}`;
    if (!attuale?.openrouter_api_key) {
      return { error: t("chiave.errore.incolla") };
    }
    await sql`
      update venues set openrouter_model = ${modello} where id = ${venue.venueId}`;
    revalidatePath("/dashboard/settings");
    return { success: t("chiave.modello.aggiornato", { modello }) };
  }

  if (!chiave.startsWith("sk-or-")) {
    return { error: t("chiave.errore.prefisso") };
  }

  await sql`
    update venues set
      openrouter_api_key = ${encryptSecret(chiave)},
      openrouter_model = ${modello}
    where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");
  return {
    success: t("chiave.collegata", { modello }),
  };
}
