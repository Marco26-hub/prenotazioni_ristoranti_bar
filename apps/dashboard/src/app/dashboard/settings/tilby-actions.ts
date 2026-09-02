"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { encryptSecret } from "@repo/shared/crypto";
import { getTilbyShop } from "@repo/shared/tilby";
import { requireRole } from "@/lib/authz";

export interface TilbyResult {
  error?: string;
  shopName?: string;
  disconnected?: boolean;
}

export async function connectTilby(formData: FormData): Promise<TilbyResult> {
  const { venue } = await requireRole(["owner", "manager"]);
  const token = String(formData.get("token") ?? "").trim();

  if (!token) return { error: "Inserisci il token Tilby" };

  // Verificare il token prima di salvarlo: così un token sbagliato lo si
  // scopre subito, e non al primo import fallito.
  let shopName: string;
  try {
    const shop = await getTilbyShop(token);
    shopName = shop.name;
  } catch (err) {
    console.error("[tilby] verifica token fallita:", err);
    return {
      error: err instanceof Error ? err.message : "Impossibile contattare Tilby",
    };
  }

  const sql = db();
  await sql`
    update venues set tilby_token = ${encryptSecret(token)}, tilby_shop_name = ${shopName}
    where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");
  return { shopName };
}

export async function disconnectTilby(): Promise<TilbyResult> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();
  await sql`
    update venues set tilby_token = null, tilby_shop_name = null
    where id = ${venue.venueId}`;
  revalidatePath("/dashboard/settings");
  return { disconnected: true };
}
