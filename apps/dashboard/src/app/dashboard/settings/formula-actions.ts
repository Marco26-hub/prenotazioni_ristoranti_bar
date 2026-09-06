"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tImpostazioni } from "@/i18n/impostazioni";

export interface EsitoFormula {
  error?: string;
  success?: string;
}

/** Euro digitati dal ristoratore → centesimi, con la virgola ammessa. */
function centesimi(v: FormDataEntryValue | null): number | null {
  const testo = String(v ?? "").trim().replace(",", ".");
  if (testo === "") return null;
  const n = Number.parseFloat(testo);
  if (!Number.isFinite(n) || n < 0 || n > 500) return NaN;
  return Math.round(n * 100);
}

/**
 * La formula a prezzo fisso: si paga a persona, i piatti compresi valgono
 * zero.
 *
 * Due prezzi perché in Italia il pranzo costa meno della cena quasi
 * ovunque, e un prezzo solo costringerebbe il locale a scegliere quale dei
 * due sbagliare.
 */
export async function salvaFormula(formData: FormData): Promise<EsitoFormula> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tImpostazioni(await linguaUtente());

  const attiva = formData.get("attiva") === "on";
  const predefinita = formData.get("predefinita") === "on";

  const pranzo = centesimi(formData.get("pranzo"));
  const cena = centesimi(formData.get("cena"));
  const supplemento = centesimi(formData.get("supplemento"));

  if (Number.isNaN(pranzo) || Number.isNaN(cena) || Number.isNaN(supplemento)) {
    return { error: t("formula.errore.prezzi") };
  }

  /*
   * Tre casi distinti per i bambini, e vanno tenuti distinti.
   *
   * Campo vuoto: pagano come gli adulti. Zero: non pagano. Un numero: quello.
   * Trattare il vuoto come zero regalerebbe il coperto a ogni bambino di
   * ogni tavolo senza che nessuno l'abbia deciso.
   */
  const modoBambini = String(formData.get("modoBambini") ?? "adulti");
  let bambino: number | null = null;
  if (modoBambini === "gratis") bambino = 0;
  else if (modoBambini === "ridotto") {
    const b = centesimi(formData.get("bambino"));
    if (b === null || Number.isNaN(b)) {
      return { error: t("formula.errore.bambino") };
    }
    bambino = b;
  }

  const etaTesto = String(formData.get("etaMax") ?? "").trim();
  const eta = etaTesto === "" ? null : Number.parseInt(etaTesto, 10);
  if (eta !== null && (!Number.isFinite(eta) || eta < 0 || eta > 17)) {
    return { error: t("formula.errore.eta") };
  }

  const oraCena = String(formData.get("oraCena") ?? "17:00");
  if (!/^\d{2}:\d{2}$/.test(oraCena)) return { error: t("formula.errore.ora") };

  // Attivarla senza prezzi lascerebbe i tavoli a formula con un conto a
  // zero: meglio dirlo adesso che scoprirlo alla chiusura del primo.
  if (attiva && (pranzo ?? 0) <= 0 && (cena ?? 0) <= 0) {
    return { error: t("formula.errore.senza_prezzo") };
  }

  const sql = db();

  /*
   * Spegnere la formula non cancella come era configurata.
   *
   * I campi si smontano dall'interfaccia quando la spunta si toglie, quindi
   * il modulo non li manda più e arrivavano vuoti: prezzi, tariffa bambino,
   * ora della cena e nota sparivano. Chi la spegneva a gennaio e la
   * riaccendeva a giugno ricominciava da zero, e nel frattempo un tavolo
   * riacceso per sbaglio avrebbe pagato zero.
   */
  if (!attiva) {
    await sql`update venues set formula_attiva = false where id = ${venue.venueId}`;
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: t("formula.ok.spenta") };
  }

  await sql`
    update venues set
      formula_attiva = ${attiva},
      formula_predefinita = ${predefinita},
      formula_pranzo_cents = ${pranzo ?? 0},
      formula_cena_cents = ${cena ?? 0},
      formula_ora_cena = ${oraCena},
      formula_bambino_cents = ${bambino},
      formula_bambino_eta_max = ${eta},
      formula_supplemento_cents = ${supplemento ?? 0},
      formula_nota = ${String(formData.get("nota") ?? "").trim().slice(0, 500) || null}
    where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  return {
    success: predefinita ? t("formula.ok.predefinita") : t("formula.ok.carta"),
  };
}
