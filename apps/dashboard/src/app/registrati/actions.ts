"use server";

import bcrypt from "bcryptjs";
import { db } from "@repo/shared/db";
import { checkRateLimit } from "@repo/shared/rate-limit";
import { headers } from "next/headers";

export interface SignupResult {
  error?: string;
  success?: boolean;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/**
 * Registrazione di un nuovo locale. È l'unico endpoint pubblico non
 * autenticato della dashboard, quindi ha rate limit per IP e crea sempre
 * il primo utente come 'owner' del proprio locale.
 */
export async function signup(formData: FormData): Promise<SignupResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = await checkRateLimit(`signup:${ip}`, 5, 3600);
  if (!allowed) {
    return { error: "Troppi tentativi, riprova più tardi" };
  }

  const venueName = String(formData.get("venueName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const tableCount = Number.parseInt(String(formData.get("tableCount") ?? "0"), 10);

  if (!venueName || !email || !email.includes("@")) {
    return { error: "Nome locale ed email sono obbligatori" };
  }
  if (password.length < 8) {
    return { error: "La password deve essere di almeno 8 caratteri" };
  }
  if (!Number.isFinite(tableCount) || tableCount < 1 || tableCount > 200) {
    return { error: "Numero tavoli non valido (1-200)" };
  }

  const sql = db();

  const [existing] = await sql<{ id: string }[]>`select id from users where email = ${email}`;
  if (existing) {
    return { error: "Esiste già un account con questa email" };
  }

  // Lo slug finisce nell'URL dei QR e deve essere unico: se il nome è già
  // preso si aggiunge un suffisso invece di fallire.
  const base = slugify(venueName) || "locale";
  let slug = base;
  for (let attempt = 1; ; attempt++) {
    const [taken] = await sql<{ id: string }[]>`select id from venues where slug = ${slug}`;
    if (!taken) break;
    slug = `${base}-${attempt + 1}`;
  }

  try {
    await sql.begin(async (tx) => {
      const [user] = await tx<{ id: string }[]>`
        insert into users (email, password_hash, name)
        values (${email}, ${bcrypt.hashSync(password, 10)}, ${venueName})
        returning id`;

      const [venue] = await tx<{ id: string }[]>`
        insert into venues (owner_id, name, slug, currency)
        values (${user.id}, ${venueName}, ${slug}, 'EUR')
        returning id`;

      await tx`insert into venue_staff (venue_id, user_id, role)
        values (${venue.id}, ${user.id}, 'owner')`;

      for (let i = 1; i <= tableCount; i++) {
        await tx`insert into tables (venue_id, code, seats)
          values (${venue.id}, ${"T" + i}, 4)`;
      }

      for (const [i, name] of ["Antipasti", "Primi", "Secondi", "Dolci", "Bevande"].entries()) {
        await tx`insert into menu_categories (venue_id, name, sort_order)
          values (${venue.id}, ${name}, ${i + 1})`;
      }
    });
  } catch (err) {
    console.error("[signup] creazione locale fallita:", err);
    return { error: "Registrazione non riuscita, riprova" };
  }

  return { success: true };
}
