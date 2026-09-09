"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { COLONNE, RIGHE, type Posizione } from "./sala-griglia";
import { tSala } from "@/i18n/sala";
import { linguaUtente } from "@/lib/lingua";


/**
 * Salva la disposizione della sala.
 *
 * Arriva tutta insieme e non un tavolo alla volta: trascinandone uno si
 * spostano spesso anche i vicini, e salvare a ogni rilascio riempirebbe la
 * rete di richieste che si sorpassano fra loro.
 */
export async function salvaPianta(
  posizioni: Posizione[]
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tSala(await linguaUtente());

  if (posizioni.length > 400) return { error: t("azioni.pianta.troppi") };

  // I limiti vanno riapplicati qui: il browser manda quello che vuole, e una
  // coordinata fuori griglia renderebbe il tavolo irraggiungibile.
  const pulite = posizioni
    .filter((p) => typeof p.id === "string" && p.id.length === 36)
    .map((p) => ({
      id: p.id,
      x: Math.min(COLONNE - 1, Math.max(0, Math.round(Number(p.x) || 0))),
      y: Math.min(RIGHE - 1, Math.max(0, Math.round(Number(p.y) || 0))),
    }));

  if (pulite.length === 0) return { error: t("azioni.pianta.niente_salvare") };

  const sql = db();
  await sql`
    with nuove as (
      select id::uuid, x::integer, y::integer
        from jsonb_to_recordset(${sql.json(pulite)}::jsonb)
          as posizione(id text, x integer, y integer)
    )
    update tables as t
       set pos_x = nuove.x, pos_y = nuove.y
      from nuove
     where t.id = nuove.id and t.venue_id = ${venue.venueId}`;

  revalidatePath("/dashboard");
  return { ok: t("azioni.pianta.salvata") };
}

/**
 * Aggiunge un tavolo direttamente dalla pianta.
 *
 * Prima si passava da "QR e tavoli": chi stava disponendo la sala doveva
 * cambiare pagina, creare il tavolo e tornare indietro a cercarlo.
 */
export async function aggiungiTavoloInSala(
  formData: FormData
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tSala(await linguaUtente());

  const code = String(formData.get("code") ?? "").trim();
  const seats = Number.parseInt(String(formData.get("seats") ?? "2"), 10);
  const shape = String(formData.get("shape") ?? "rettangolo");
  const zona = String(formData.get("zona") ?? "").trim().slice(0, 40) || null;

  if (!code) return { error: t("azioni.pianta.serve_nome") };
  if (code.length > 20) return { error: t("azioni.pianta.nome_lungo") };
  if (!Number.isFinite(seats) || seats < 1 || seats > 40) {
    return { error: t("azioni.pianta.posti") };
  }
  if (!["rettangolo", "tondo", "bancone"].includes(shape)) {
    return { error: t("azioni.pianta.forma") };
  }

  const x = Number.parseInt(String(formData.get("x") ?? ""), 10);
  const y = Number.parseInt(String(formData.get("y") ?? ""), 10);

  const sql = db();

  const [esiste] = await sql<{ id: string }[]>`
    select id from tables where venue_id = ${venue.venueId} and code = ${code}`;
  if (esiste) return { error: t("azioni.pianta.gia_esiste", { codice: code }) };

  await sql`
    insert into tables (venue_id, code, seats, shape, zone, pos_x, pos_y)
    values (
      ${venue.venueId}, ${code}, ${seats}, ${shape}, ${zona},
      ${Number.isFinite(x) ? Math.min(COLONNE - 1, Math.max(0, x)) : null},
      ${Number.isFinite(y) ? Math.min(RIGHE - 1, Math.max(0, y)) : null}
    )`;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tables");
  return { ok: t("azioni.pianta.aggiunto", { codice: code }) };
}

/** Forma e posti si correggono senza uscire dalla pianta. */
export async function aggiornaTavoloInSala(
  formData: FormData
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tSala(await linguaUtente());

  const id = String(formData.get("id") ?? "");
  const seats = Number.parseInt(String(formData.get("seats") ?? ""), 10);
  const shape = String(formData.get("shape") ?? "rettangolo");
  // Sala 1, Dehors, Veranda: il nome lo dà il locale, non noi. Un elenco
  // chiuso non reggerebbe il primo locale con la "sala del camino".
  const zona = String(formData.get("zona") ?? "").trim().slice(0, 40) || null;

  if (!Number.isFinite(seats) || seats < 1 || seats > 40) {
    return { error: t("azioni.pianta.posti") };
  }
  if (!["rettangolo", "tondo", "bancone"].includes(shape)) {
    return { error: t("azioni.pianta.forma") };
  }

  const sql = db();
  const [row] = await sql<{ id: string }[]>`
    update tables set seats = ${seats}, shape = ${shape}, zone = ${zona}
     where id = ${id} and venue_id = ${venue.venueId}
    returning id`;

  if (!row) return { error: t("azioni.pianta.non_trovato") };

  revalidatePath("/dashboard");
  return { ok: t("azioni.pianta.aggiornato") };
}
