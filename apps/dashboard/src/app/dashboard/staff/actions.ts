"use server";

import { repartiDelLocale } from "@/lib/reparti-locale";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tPersone } from "@/i18n/persone";
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
  const t = tPersone(await linguaUtente());

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as StaffRole;

  if (!email.includes("@")) return { error: t("azione.email_non_valida") };
  if (password.length < 8) return { error: t("azione.password_corta") };
  if (!ROLES.includes(role)) return { error: t("azione.ruolo_non_valido") };

  const sql = db();

  // Se l'email appartiene già a qualcuno non lo si aggiunge d'ufficio a
  // questo locale: sarebbe dare accesso ai propri dati a un account altrui
  // senza il suo consenso, e cambierebbe il locale che quella persona vede
  // aprendo la dashboard.
  const [existing] = await sql<{ id: string }[]>`select id from users where email = ${email}`;
  if (existing) {
    return { error: t("azione.email_esistente") };
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
  const t = tPersone(await linguaUtente());
  const sql = db();

  const [member] = await sql<{ user_id: string; role: StaffRole }[]>`
    select user_id, role from venue_staff
    where id = ${staffId} and venue_id = ${venue.venueId}`;

  if (!member) return { error: t("azione.membro_non_trovato") };

  if (member.user_id === userId) {
    return { error: t("azione.non_rimuovere_te") };
  }

  // Un locale senza titolari resterebbe senza nessuno in grado di gestire
  // accessi, pagamenti e dati fiscali.
  if (member.role === "owner") {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from venue_staff
      where venue_id = ${venue.venueId} and role = 'owner'`;
    if (n <= 1) return { error: t("azione.almeno_un_titolare") };
  }

  await sql`delete from venue_staff where id = ${staffId} and venue_id = ${venue.venueId}`;

  revalidatePath("/dashboard/staff");
  return { removed: true };
}

export async function changeStaffRole(staffId: string, role: StaffRole): Promise<StaffResult> {
  const { venue, userId } = await requireRole(["owner"]);
  const t = tPersone(await linguaUtente());
  if (!ROLES.includes(role)) return { error: t("azione.ruolo_non_valido") };

  const sql = db();
  const [member] = await sql<{ user_id: string; role: StaffRole }[]>`
    select user_id, role from venue_staff
    where id = ${staffId} and venue_id = ${venue.venueId}`;

  if (!member) return { error: t("azione.membro_non_trovato") };
  if (member.user_id === userId) {
    return { error: t("azione.non_cambiare_te") };
  }

  if (member.role === "owner" && role !== "owner") {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from venue_staff
      where venue_id = ${venue.venueId} and role = 'owner'`;
    if (n <= 1) return { error: t("azione.almeno_un_titolare") };
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
  const t = tPersone(await linguaUtente());
  const sql = db();

  const [membro] = await sql<{ id: string }[]>`
    select id from venue_staff
     where venue_id = ${venue.venueId} and user_id = ${userId}`;
  if (!membro) return { error: t("azione.non_del_locale") };

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
  return {
    ok:
      ids.length === 0
        ? t("azione.rango_svuotato")
        : t.n(ids.length, "azione.tavoli_assegnati"),
  };
}




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
  const t = tPersone(await linguaUtente());
  const sql = db();

  /*
   * Solo postazioni che questo locale ha davvero.
   *
   * L'elenco è suo, non del programma: dare a qualcuno il permesso su una
   * postazione che non esiste vuol dire un permesso che non si applica a
   * niente, e nessuno se ne accorge finché non serve.
   */
  const suoi = await repartiDelLocale(venue.venueId);
  const valide = new Set(suoi.map((r) => r.chiave));
  const puliti = [...new Set((reparti ?? []).filter((r) => valide.has(r)))];

  const [row] = await sql<{ id: string }[]>`
    update venue_staff set reparti = ${puliti}
     where venue_id = ${venue.venueId} and user_id = ${userId}
    returning id`;

  if (!row) return { error: t("azione.non_del_locale") };

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/orders");
  return {
    ok:
      puliti.length === 0
        ? t("azione.tutti_i_reparti")
        : t("azione.opera_su", { reparti: t.elenco(puliti) }),
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
  const t = tPersone(await linguaUtente());
  const sql = db();

  const [membro] = await sql<{ role: string }[]>`
    select role from venue_staff
     where venue_id = ${venue.venueId} and user_id = ${userId}`;
  if (!membro) return { error: t("azione.non_del_locale") };

  const pulito = codice.trim();

  if (!pulito) {
    await sql`
      update venue_staff set codice_hash = null, codice_suffisso = null
       where venue_id = ${venue.venueId} and user_id = ${userId}`;
    revalidatePath("/dashboard/staff");
    return { ok: t("azione.codice_rimosso") };
  }

  if (membro.role === "owner" || membro.role === "manager") {
    return { error: t("azione.codice_vietato") };
  }

  if (!/^\d{4,6}$/.test(pulito)) {
    return { error: t("azione.codice_cifre") };
  }
  // Sequenze ovvie: su un tablet appoggiato al passe le prova chiunque.
  if (/^(\d)\1+$/.test(pulito) || "0123456789".includes(pulito)) {
    return { error: t("azione.codice_facile") };
  }

  const [occupato] = await sql<{ user_id: string }[]>`
    select user_id from venue_staff
     where venue_id = ${venue.venueId} and codice_suffisso = ${pulito}
       and user_id <> ${userId}`;
  if (occupato) return { error: t("azione.codice_occupato") };

  await sql`
    update venue_staff
       set codice_hash = ${await bcrypt.hash(pulito, 10)},
           codice_suffisso = ${pulito}
     where venue_id = ${venue.venueId} and user_id = ${userId}`;

  revalidatePath("/dashboard/staff");
  return { ok: t("azione.codice_assegnato", { codice: pulito }) };
}
