"use server";

import bcrypt from "bcryptjs";
import { db } from "@repo/shared/db";
import { checkRateLimit, pseudonymise } from "@repo/shared/rate-limit";
import { DPA_VERSION } from "@/lib/dpa";
import { headers } from "next/headers";
import { messaggioErrore } from "@repo/shared/errori";
import { tGuscio } from "@/i18n/guscio";
import { linguaUtente } from "@/lib/lingua";

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
  // Nessuna sessione qui: la lingua viene dal cookie o dal browser, che è
  // tutto quello che si sa di chi non ha ancora un account.
  const t = tGuscio(await linguaUtente());
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = await checkRateLimit(`signup:${pseudonymise(ip)}`, 5, 3600);
  if (!allowed) {
    return { error: t("registrazione.errore.troppi") };
  }

  const venueName = String(formData.get("venueName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const tableCount = Number.parseInt(String(formData.get("tableCount") ?? "0"), 10);

  if (!venueName || !email || !email.includes("@")) {
    return { error: t("registrazione.errore.campi") };
  }
  if (password.length < 8) {
    return { error: t("registrazione.errore.password") };
  }
  if (!Number.isFinite(tableCount) || tableCount < 1 || tableCount > 200) {
    return { error: t("registrazione.errore.tavoli") };
  }
  // Riverificato lato server: il `required` sulla casella vive solo nel
  // browser, e questa action è un endpoint POST raggiungibile comunque.
  if (formData.get("dpa") !== "on") {
    return { error: t("registrazione.errore.dpa") };
  }

  const sql = db();

  const [existing] = await sql<{ id: string }[]>`select id from users where email = ${email}`;
  if (existing) {
    return { error: t("registrazione.errore.email_presa") };
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
        insert into venues (owner_id, name, slug, currency,
                            dpa_accepted_at, dpa_version)
        values (${user.id}, ${venueName}, ${slug}, 'EUR',
                now(), ${DPA_VERSION})
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
    console.error(`[signup] creazione locale fallita: ${messaggioErrore(err)}`);
    return { error: t("registrazione.errore.generico") };
  }

  return { success: true };
}
