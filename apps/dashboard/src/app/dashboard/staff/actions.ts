"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import type { StaffRole } from "@repo/shared";

export interface StaffResult {
  error?: string;
  ok?: string;
  createdEmail?: string;
  removed?: boolean;
}

const ROLES: StaffRole[] = ["owner", "manager", "waiter", "kitchen"];

export async function addStaff(formData: FormData): Promise<StaffResult> {
  // Solo il titolare gestisce gli accessi: un manager che potesse creare
  // utenti potrebbe promuoversi a owner.
  const { venue } = await requireRole(["owner"]);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as StaffRole;

  if (!email.includes("@")) return { error: "Email non valida" };
  if (password.length < 8) return { error: "La password deve essere di almeno 8 caratteri" };
  if (!ROLES.includes(role)) return { error: "Ruolo non valido" };

  const sql = db();

  // Se l'email appartiene già a qualcuno non lo si aggiunge d'ufficio a
  // questo locale: sarebbe dare accesso ai propri dati a un account altrui
  // senza il suo consenso, e cambierebbe il locale che quella persona vede
  // aprendo la dashboard.
  const [existing] = await sql<{ id: string }[]>`select id from users where email = ${email}`;
  if (existing) {
    return { error: "Esiste già un account con questa email" };
  }

  await sql.begin(async (tx) => {
    const [user] = await tx<{ id: string }[]>`
      insert into users (email, password_hash, name)
      values (${email}, ${bcrypt.hashSync(password, 10)}, ${name})
      returning id`;

    await tx`insert into venue_staff (venue_id, user_id, role)
      values (${venue.venueId}, ${user.id}, ${role})`;
  });

  revalidatePath("/dashboard/staff");
  return { createdEmail: email };
}

export async function removeStaff(staffId: string): Promise<StaffResult> {
  const { venue, userId } = await requireRole(["owner"]);
  const sql = db();

  const [member] = await sql<{ user_id: string; role: StaffRole }[]>`
    select user_id, role from venue_staff
    where id = ${staffId} and venue_id = ${venue.venueId}`;

  if (!member) return { error: "Membro non trovato" };

  if (member.user_id === userId) {
    return { error: "Non puoi rimuovere te stesso" };
  }

  // Un locale senza titolari resterebbe senza nessuno in grado di gestire
  // accessi, pagamenti e dati fiscali.
  if (member.role === "owner") {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from venue_staff
      where venue_id = ${venue.venueId} and role = 'owner'`;
    if (n <= 1) return { error: "Deve restare almeno un titolare" };
  }

  await sql`delete from venue_staff where id = ${staffId} and venue_id = ${venue.venueId}`;

  revalidatePath("/dashboard/staff");
  return { removed: true };
}

export async function changeStaffRole(staffId: string, role: StaffRole): Promise<StaffResult> {
  const { venue, userId } = await requireRole(["owner"]);
  if (!ROLES.includes(role)) return { error: "Ruolo non valido" };

  const sql = db();
  const [member] = await sql<{ user_id: string; role: StaffRole }[]>`
    select user_id, role from venue_staff
    where id = ${staffId} and venue_id = ${venue.venueId}`;

  if (!member) return { error: "Membro non trovato" };
  if (member.user_id === userId) {
    return { error: "Non puoi cambiare il tuo stesso ruolo" };
  }

  if (member.role === "owner" && role !== "owner") {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from venue_staff
      where venue_id = ${venue.venueId} and role = 'owner'`;
    if (n <= 1) return { error: "Deve restare almeno un titolare" };
  }

  await sql`
    update venue_staff set role = ${role}
    where id = ${staffId} and venue_id = ${venue.venueId}`;

  revalidatePath("/dashboard/staff");
  return {};
}

/**
 * Assegna a un addetto i tavoli di cui si occupa.
 *
 * Arriva l'elenco completo e non le singole differenze: il rango si compone
 * guardando la sala, si spuntano i tavoli e si conferma. Mandare le
 * differenze richiederebbe di sapere da cosa si è partiti, e due responsabili
 * che sistemano il rango insieme si sovrascriverebbero a metà.
 */
export async function assegnaTavoli(
  userId: string,
  tableIds: string[]
): Promise<StaffResult> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const [membro] = await sql<{ id: string }[]>`
    select id from venue_staff
     where venue_id = ${venue.venueId} and user_id = ${userId}`;
  if (!membro) return { error: "Questa persona non fa parte del locale" };

  const ids = (tableIds ?? []).filter((t) => typeof t === "string" && t.length === 36);

  await sql.begin(async (tx) => {
    // Prima si libera tutto il suo rango, poi si riassegna: senza questo, un
    // tavolo tolto dall'elenco resterebbe suo per sempre.
    await tx`
      update tables set assigned_to = null
       where venue_id = ${venue.venueId} and assigned_to = ${userId}`;

    if (ids.length > 0) {
      await tx`
        update tables set assigned_to = ${userId}
         where venue_id = ${venue.venueId} and id in ${tx(ids)}`;
    }
  });

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  return { ok: ids.length === 0 ? "Rango svuotato." : `${ids.length} tavoli assegnati.` };
}
