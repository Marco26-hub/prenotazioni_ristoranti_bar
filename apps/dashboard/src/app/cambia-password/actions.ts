"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import { tGuscio } from "@/i18n/guscio";
import { linguaUtente } from "@/lib/lingua";

export async function cambiaPassword(
  formData: FormData
): Promise<{ error?: string }> {
  const session = await auth();
  const t = tGuscio(await linguaUtente());
  if (!session?.user.id) return { error: t("primaccesso.errore.non_autorizzato") };

  const nuova = String(formData.get("nuova") ?? "");
  const conferma = String(formData.get("conferma") ?? "");

  if (nuova.length < 10) return { error: t("primaccesso.errore.corta") };
  if (nuova !== conferma) return { error: t("primaccesso.errore.diverse") };
  if (/^\d+$/.test(nuova)) return { error: t("primaccesso.errore.solo_numeri") };

  const sql = db();
  await sql`
    update users
       set password_hash = ${bcrypt.hashSync(nuova, 10)},
           must_change_password = false
     where id = ${session.user.id}`;

  redirect("/dashboard");
}
