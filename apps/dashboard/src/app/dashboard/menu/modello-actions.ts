"use server";

import { requireRole } from "@/lib/authz";
import { applicaFormato } from "@/lib/formato";
import { MODELLI } from "@repo/shared/formati";
import type { EsitoModello } from "@/lib/formato";

export type { EsitoModello };

/** Il ristoratore applica un formato al proprio menu. */
export async function applicaModello(formData: FormData): Promise<EsitoModello> {
  const { venue } = await requireRole(["owner", "manager"], "ordini");
  return applicaFormato(
    venue.venueId,
    String(formData.get("tipo") ?? ""),
    formData.get("soloCategorie") === "on",
    formData.get("conListino") === "on"
  );
}

/** Elenco dei formati, per la scelta in interfaccia. */
export async function formatiDisponibili() {
  return MODELLI.map((m) => ({
    tipo: m.tipo,
    nome: m.nome,
    descrizione: m.descrizione,
    categorie: m.categorie.length,
    gruppi: m.gruppi.length,
  }));
}
