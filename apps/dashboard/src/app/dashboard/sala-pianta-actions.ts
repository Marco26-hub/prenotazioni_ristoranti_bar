"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { COLONNE, RIGHE, type Posizione } from "./sala-griglia";


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

  if (posizioni.length > 400) return { error: "Troppi tavoli in una volta" };

  // I limiti vanno riapplicati qui: il browser manda quello che vuole, e una
  // coordinata fuori griglia renderebbe il tavolo irraggiungibile.
  const pulite = posizioni
    .filter((p) => typeof p.id === "string" && p.id.length === 36)
    .map((p) => ({
      id: p.id,
      x: Math.min(COLONNE - 1, Math.max(0, Math.round(Number(p.x) || 0))),
      y: Math.min(RIGHE - 1, Math.max(0, Math.round(Number(p.y) || 0))),
    }));

  if (pulite.length === 0) return { error: "Niente da salvare" };

  const sql = db();
  await sql.begin(async (tx) => {
    for (const p of pulite) {
      await tx`
        update tables set pos_x = ${p.x}, pos_y = ${p.y}
         where id = ${p.id} and venue_id = ${venue.venueId}`;
    }
  });

  revalidatePath("/dashboard");
  return { ok: "Sala salvata." };
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

  const code = String(formData.get("code") ?? "").trim();
  const seats = Number.parseInt(String(formData.get("seats") ?? "2"), 10);
  const shape = String(formData.get("shape") ?? "rettangolo");

  if (!code) return { error: "Serve un nome, es. T11 o Dehors 3" };
  if (code.length > 20) return { error: "Nome troppo lungo" };
  if (!Number.isFinite(seats) || seats < 1 || seats > 40) {
    return { error: "Posti fra 1 e 40" };
  }
  if (!["rettangolo", "tondo", "bancone"].includes(shape)) {
    return { error: "Forma non valida" };
  }

  const x = Number.parseInt(String(formData.get("x") ?? ""), 10);
  const y = Number.parseInt(String(formData.get("y") ?? ""), 10);

  const sql = db();

  const [esiste] = await sql<{ id: string }[]>`
    select id from tables where venue_id = ${venue.venueId} and code = ${code}`;
  if (esiste) return { error: `Esiste già un tavolo ${code}` };

  await sql`
    insert into tables (venue_id, code, seats, shape, pos_x, pos_y)
    values (
      ${venue.venueId}, ${code}, ${seats}, ${shape},
      ${Number.isFinite(x) ? Math.min(COLONNE - 1, Math.max(0, x)) : null},
      ${Number.isFinite(y) ? Math.min(RIGHE - 1, Math.max(0, y)) : null}
    )`;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tables");
  return { ok: `Tavolo ${code} aggiunto.` };
}

/** Forma e posti si correggono senza uscire dalla pianta. */
export async function aggiornaTavoloInSala(
  formData: FormData
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);

  const id = String(formData.get("id") ?? "");
  const seats = Number.parseInt(String(formData.get("seats") ?? ""), 10);
  const shape = String(formData.get("shape") ?? "rettangolo");

  if (!Number.isFinite(seats) || seats < 1 || seats > 40) {
    return { error: "Posti fra 1 e 40" };
  }
  if (!["rettangolo", "tondo", "bancone"].includes(shape)) {
    return { error: "Forma non valida" };
  }

  const sql = db();
  const [row] = await sql<{ id: string }[]>`
    update tables set seats = ${seats}, shape = ${shape}
     where id = ${id} and venue_id = ${venue.venueId}
    returning id`;

  if (!row) return { error: "Tavolo non trovato" };

  revalidatePath("/dashboard");
  return { ok: "Tavolo aggiornato." };
}
