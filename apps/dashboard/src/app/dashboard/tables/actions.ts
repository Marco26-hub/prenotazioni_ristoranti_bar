"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";

export async function addTable(formData: FormData) {
  const { venue } = await requireRole(["owner", "manager"], "ordini");
  const code = String(formData.get("code") ?? "").trim();
  const seats = Number.parseInt(String(formData.get("seats") ?? "2"), 10);
  if (!code || !Number.isFinite(seats) || seats < 1) return;

  const sql = db();

  // `tables` ha unique(venue_id, code): l'insert nudo su un codice già battuto
  // lanciava 23505 fin dentro la Server Action, e senza error.tsx l'addetto si
  // ritrovava la pagina di errore di Next al posto del tavolo. Chi ribatte
  // "12" ha già il tavolo 12: non c'è niente da fare, si torna alla lista.
  const [esiste] = await sql<{ id: string }[]>`
    select id from tables where venue_id = ${venue.venueId} and code = ${code}`;
  if (esiste) {
    revalidatePath("/dashboard/tables");
    return;
  }

  await sql`insert into tables (venue_id, code, seats) values (${venue.venueId}, ${code}, ${seats})`;
  revalidatePath("/dashboard/tables");
}

export async function toggleTableActive(tableId: string, active: boolean) {
  const { venue } = await requireRole(["owner", "manager"], "ordini");
  const sql = db();
  await sql`update tables set active = ${active} where id = ${tableId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/tables");
}

export async function updateTable(formData: FormData) {
  const { venue } = await requireRole(["owner", "manager"], "ordini");
  const tableId = String(formData.get("tableId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const seats = Number.parseInt(String(formData.get("seats") ?? ""), 10);
  if (!tableId || !code || !Number.isFinite(seats) || seats < 1) return;

  const sql = db();

  // Stesso vincolo dell'inserimento. Il tavolo che si sta modificando è
  // escluso: rinominarlo con il codice che ha già è una modifica dei soli
  // posti, non un doppione.
  const [esiste] = await sql<{ id: string }[]>`
    select id from tables
     where venue_id = ${venue.venueId} and code = ${code} and id <> ${tableId}`;
  if (esiste) {
    revalidatePath("/dashboard/tables");
    return;
  }

  await sql`
    update tables set code = ${code}, seats = ${seats}
    where id = ${tableId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/tables");
}

/**
 * Rigenera il token nel QR: serve quando un QR stampato è stato fotografato
 * o diffuso e si vuole invalidarlo. I vecchi adesivi smettono di funzionare,
 * quindi il tavolo va ristampato.
 */
export async function regenerateQrToken(tableId: string) {
  const { venue } = await requireRole(["owner", "manager"], "ordini");
  const sql = db();
  await sql`
    update tables set qr_token = encode(gen_random_bytes(16), 'hex')
    where id = ${tableId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/tables");
}

export async function deleteTable(tableId: string) {
  const { venue } = await requireRole(["owner", "manager"], "ordini");
  const sql = db();

  // Un tavolo con storico ordini non si può cancellare senza perdere dati
  // contabili: in quel caso si disattiva soltanto.
  const [used] = await sql<{ n: number }[]>`
    select count(*)::int as n from table_sessions where table_id = ${tableId}`;

  if (used.n > 0) {
    await sql`update tables set active = false where id = ${tableId} and venue_id = ${venue.venueId}`;
  } else {
    await sql`delete from tables where id = ${tableId} and venue_id = ${venue.venueId}`;
  }
  revalidatePath("/dashboard/tables");
}
