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


const REPARTI_VALIDI = ["cucina", "bar", "pizzeria", "pasticceria"];

/**
 * Su quali reparti può operare un addetto.
 *
 * Nessuna spunta significa tutti: è il caso della maggioranza dei locali,
 * dove chi c'è fa tutto, e non deve costare una configurazione per partire.
 */
export async function assegnaReparti(
  userId: string,
  reparti: string[]
): Promise<StaffResult> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const puliti = [...new Set((reparti ?? []).filter((r) => REPARTI_VALIDI.includes(r)))];

  const [row] = await sql<{ id: string }[]>`
    update venue_staff set reparti = ${puliti}
     where venue_id = ${venue.venueId} and user_id = ${userId}
    returning id`;

  if (!row) return { error: "Questa persona non fa parte del locale" };

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/orders");
  return {
    ok:
      puliti.length === 0
        ? "Può operare su tutti i reparti."
        : `Opera su: ${puliti.join(", ")}.`,
  };
}

/**
 * Codice operatore per entrare in fretta da un dispositivo condiviso.
 *
 * Salvato con lo stesso hash della password, mai in chiaro: è una
 * credenziale, anche se corta. Il suffisso in chiaro serve solo a garantirne
 * l'unicità nel locale e a mostrare al titolare quale codice ha assegnato a
 * chi — due persone con lo stesso codice renderebbero ambiguo il registro,
 * che è proprio quello che il codice deve evitare.
 *
 * Solo sala e cucina: titolare e responsabile vedono incassi e dati fiscali,
 * e quattro cifre non difendono quel pannello.
 */
export async function impostaCodiceOperatore(
  userId: string,
  codice: string
): Promise<StaffResult> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const [membro] = await sql<{ role: string }[]>`
    select role from venue_staff
     where venue_id = ${venue.venueId} and user_id = ${userId}`;
  if (!membro) return { error: "Questa persona non fa parte del locale" };

  const pulito = codice.trim();

  if (!pulito) {
    await sql`
      update venue_staff set codice_hash = null, codice_suffisso = null
       where venue_id = ${venue.venueId} and user_id = ${userId}`;
    revalidatePath("/dashboard/staff");
    return { ok: "Codice rimosso: entrerà con email e password." };
  }

  if (membro.role === "owner" || membro.role === "manager") {
    return {
      error:
        "Titolare e responsabile entrano con la password: il codice non protegge incassi e dati fiscali.",
    };
  }

  if (!/^\d{4,6}$/.test(pulito)) {
    return { error: "Il codice è da 4 a 6 cifre" };
  }
  // Sequenze ovvie: su un tablet appoggiato al passe le prova chiunque.
  if (/^(\d)\1+$/.test(pulito) || "0123456789".includes(pulito)) {
    return { error: "Codice troppo facile da indovinare: cambialo" };
  }

  const [occupato] = await sql<{ user_id: string }[]>`
    select user_id from venue_staff
     where venue_id = ${venue.venueId} and codice_suffisso = ${pulito}
       and user_id <> ${userId}`;
  if (occupato) return { error: "Questo codice è già di un'altra persona" };

  await sql`
    update venue_staff
       set codice_hash = ${await bcrypt.hash(pulito, 10)},
           codice_suffisso = ${pulito}
     where venue_id = ${venue.venueId} and user_id = ${userId}`;

  revalidatePath("/dashboard/staff");
  return { ok: `Codice ${pulito} assegnato.` };
}
