"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@repo/shared/db";
import { auth } from "@/auth";

export async function cambiaPassword(
  formData: FormData
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user.id) return { error: "Non autorizzato" };

  const nuova = String(formData.get("nuova") ?? "");
  const conferma = String(formData.get("conferma") ?? "");

  if (nuova.length < 10) return { error: "Almeno 10 caratteri" };
  if (nuova !== conferma) return { error: "Le due password non coincidono" };
  if (/^\d+$/.test(nuova)) return { error: "Non solo numeri: aggiungi lettere" };

  const sql = db();
  await sql`
    update users
       set password_hash = ${bcrypt.hashSync(nuova, 10)},
           must_change_password = false
     where id = ${session.user.id}`;

  redirect("/dashboard");
}
