"use server";

import bcrypt from "bcryptjs";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tImpostazioni } from "@/i18n/impostazioni";

export interface PasswordResult {
  error?: string;
  success?: boolean;
}

/**
 * Cambio password del proprio account. Chiede la password attuale anche se
 * l'utente è già autenticato: senza, chi trovasse una sessione aperta su un
 * tablet in sala potrebbe bloccare fuori il titolare.
 */
export async function changeOwnPassword(formData: FormData): Promise<PasswordResult> {
  const { userId } = await requireVenue();
  const t = tImpostazioni(await linguaUtente());

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8) {
    return { error: t("password.errore.corta") };
  }
  if (next !== confirm) {
    return { error: t("password.errore.diverse") };
  }

  const sql = db();
  const [user] = await sql<{ password_hash: string }[]>`
    select password_hash from users where id = ${userId}`;

  if (!user || !bcrypt.compareSync(current, user.password_hash)) {
    return { error: t("password.errore.attuale") };
  }

  await sql`
    update users set password_hash = ${bcrypt.hashSync(next, 10)}
    where id = ${userId}`;

  return { success: true };
}
