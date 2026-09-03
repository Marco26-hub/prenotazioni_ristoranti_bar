"use server";

import { db } from "@repo/shared/db";
import { decryptSecret, encryptSecret } from "@repo/shared/crypto";
import { leggiEtichetta, MODELLO_PREDEFINITO, type SchedaVino } from "@repo/shared/openrouter";
import { requireRole } from "@/lib/authz";
import { revalidatePath } from "next/cache";

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

  const file = formData.get("etichetta");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Nessuna foto selezionata" };
  }
  if (!TIPI.includes(file.type)) {
    return { error: "Formato non supportato: usa JPG, PNG o WEBP" };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Foto troppo pesante (massimo 800 KB)" };
  }

  const sql = db();
  const [v] = await sql<{ openrouter_api_key: string | null; openrouter_model: string | null }[]>`
    select openrouter_api_key, openrouter_model
      from venues where id = ${venue.venueId}`;

  if (!v?.openrouter_api_key) {
    return {
      error:
        "Lettura da foto non attiva: collega una chiave OpenRouter in Impostazioni.",
    };
  }

  let chiave: string;
  try {
    chiave = decryptSecret(v.openrouter_api_key);
  } catch {
    return { error: "Chiave OpenRouter illeggibile: reinseriscila in Impostazioni." };
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
    return {
      error:
        "Non ho letto nulla di utile dalla foto. Prova con più luce, o compila a mano.",
    };
  }

  return {
    scheda,
    avviso:
      scheda.incerti && scheda.incerti.length > 0
        ? `Controlla a mano: ${scheda.incerti.join(", ")}.`
        : "Rileggi i campi prima di salvare: quello che scrivi qui lo legge il cliente.",
  };
}

export interface EsitoChiave {
  error?: string;
  success?: string;
}

export async function salvaChiaveOpenRouter(formData: FormData): Promise<EsitoChiave> {
  const { venue } = await requireRole(["owner"]);
  const sql = db();

  if (formData.get("rimuovi") === "on") {
    await sql`
      update venues set openrouter_api_key = null, openrouter_model = null
       where id = ${venue.venueId}`;
    revalidatePath("/dashboard/settings");
    return { success: "Rimossa. La lettura da foto non è più disponibile." };
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
      return { error: "Incolla la chiave OpenRouter" };
    }
    await sql`
      update venues set openrouter_model = ${modello} where id = ${venue.venueId}`;
    revalidatePath("/dashboard/settings");
    return { success: `Modello aggiornato: ${modello}. Chiave invariata.` };
  }

  if (!chiave.startsWith("sk-or-")) {
    return { error: "La chiave OpenRouter inizia per sk-or-" };
  }

  await sql`
    update venues set
      openrouter_api_key = ${encryptSecret(chiave)},
      openrouter_model = ${modello}
    where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");
  return {
    success: `Collegata. Le chiamate vengono addebitate sul tuo account OpenRouter, modello ${modello}.`,
  };
}
