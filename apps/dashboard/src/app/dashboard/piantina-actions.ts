"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { tSala } from "@/i18n/sala";
import { linguaUtente } from "@/lib/lingua";

/**
 * Piantina della sala caricata dal locale.
 *
 * Il PDF viene convertito in PNG dal browser prima dell'invio, così qui non
 * si interpreta mai un PDF a runtime.
 *
 * L'SVG invece arriva com'è, e un SVG è un documento eseguibile: può
 * contenere <script>, gestori onload e riferimenti esterni. Viene mostrato
 * solo dentro un tag <img>, che disattiva script e fetch, e comunque quello
 * che contiene viene controllato qui prima di salvarlo — un domani qualcuno
 * potrebbe inserirlo inline senza sapere da dove arriva.
 */

const LIMITE_BYTE = 1_500_000;

const TIPI = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

/** Costrutti che rendono un SVG attivo invece che una figura. */
const SVG_PERICOLOSO =
  /<\s*script|<\s*foreignObject|\son[a-z]+\s*=|javascript:|<\s*iframe|<\s*embed|<\s*use[^>]+href\s*=\s*["']\s*http/i;

export async function salvaPiantina(
  formData: FormData
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tSala(await linguaUtente());
  const sql = db();

  if (formData.get("rimuovi") === "1") {
    await sql`update venues set floor_plan_url = null where id = ${venue.venueId}`;
    revalidatePath("/dashboard");
    return { ok: t("azioni.piantina.rimossa") };
  }

  const opacitaGrezza = formData.get("opacita");
  if (opacitaGrezza !== null && !formData.get("dataUrl")) {
    const o = Math.min(100, Math.max(0, Number.parseInt(String(opacitaGrezza), 10) || 0));
    await sql`update venues set floor_plan_opacity = ${o} where id = ${venue.venueId}`;
    revalidatePath("/dashboard");
    return { ok: t("azioni.piantina.trasparenza") };
  }

  const dataUrl = String(formData.get("dataUrl") ?? "");
  if (!dataUrl) return { error: t("azioni.piantina.nessun_file") };

  const intestazione = dataUrl.match(/^data:([a-z+/-]+);base64,/i);
  if (!intestazione || !TIPI.has(intestazione[1].toLowerCase())) {
    return { error: t("azioni.piantina.formato") };
  }

  // La lunghezza della stringa base64 sovrastima del 33% i byte reali: va
  // bene, il limite serve a proteggere la riga e la pagina, non a essere esatto.
  if (dataUrl.length > LIMITE_BYTE * 1.4) {
    return { error: t("azioni.piantina.pesante") };
  }

  if (intestazione[1].toLowerCase() === "image/svg+xml") {
    let testo = "";
    try {
      testo = Buffer.from(dataUrl.slice(intestazione[0].length), "base64").toString("utf8");
    } catch {
      return { error: t("azioni.piantina.svg_illeggibile") };
    }
    if (!/<\s*svg/i.test(testo)) return { error: t("azioni.piantina.non_svg") };
    if (SVG_PERICOLOSO.test(testo)) {
      return { error: t("azioni.piantina.svg_attivo") };
    }
  }

  const opacita = Math.min(
    100,
    Math.max(0, Number.parseInt(String(formData.get("opacita") ?? "35"), 10) || 35)
  );

  await sql`
    update venues
       set floor_plan_url = ${dataUrl}, floor_plan_opacity = ${opacita}
     where id = ${venue.venueId}`;

  revalidatePath("/dashboard");
  return { ok: t("azioni.piantina.caricata") };
}
