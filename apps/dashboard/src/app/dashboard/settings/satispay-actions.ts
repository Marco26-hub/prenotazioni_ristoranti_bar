"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { obtainSatispayKeyId } from "@repo/shared/satispay";
import { requireRole } from "@/lib/authz";

export async function connectSatispay(formData: FormData) {
  const { venue } = await requireRole(["owner", "manager"]);
  const activationToken = String(formData.get("activationToken") ?? "").trim();
  if (!activationToken) return { error: "Codice attivazione mancante" };

  // La coppia di chiavi si genera una volta sola, qui: solo la chiave
  // pubblica lascia il server (va a Satispay per l'attivazione), la privata
  // resta nel nostro DB e firma le richieste future per conto del locale.
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  try {
    const keyId = await obtainSatispayKeyId(publicKey, activationToken);

    const sql = db();
    await sql`
      update venues set satispay_key_id = ${keyId}, satispay_private_key = ${privateKey}
      where id = ${venue.venueId}`;

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Attivazione Satispay non riuscita",
    };
  }
}
