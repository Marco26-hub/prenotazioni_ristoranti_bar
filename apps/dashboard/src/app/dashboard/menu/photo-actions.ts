"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";

export interface PhotoResult {
  error?: string;
  success?: boolean;
}

/**
 * Le foto stanno in colonna come data URL, come il logo. Il limite è basso
 * di proposito: sono immagini che il cliente scarica al tavolo, spesso in
 * 3G, e un menu con venti foto pesanti diventa inutilizzabile.
 *
 * Con molti locali e molti piatti questa scelta va rivista: le immagini
 * appartengono a un object storage, con in colonna solo l'URL.
 */
const MAX_PHOTO_BYTES = 300 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function saveDishPhoto(formData: FormData): Promise<PhotoResult> {
  const { venue } = await requireRole(["owner", "manager"]);

  const itemId = String(formData.get("itemId") ?? "");
  const remove = formData.get("removePhoto") === "on";
  const photo = formData.get("photo");

  if (!itemId) return { error: "Piatto non indicato" };

  const sql = db();

  if (remove) {
    await sql`
      update menu_items set image_url = null
      where id = ${itemId} and venue_id = ${venue.venueId}`;
    revalidatePath("/dashboard/menu");
    return { success: true };
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Nessuna immagine selezionata" };
  }
  if (!ALLOWED_TYPES.includes(photo.type)) {
    return { error: "Formato non supportato: usa JPG, PNG o WEBP" };
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return { error: "Immagine troppo pesante (massimo 300 KB)" };
  }

  const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");

  await sql`
    update menu_items set image_url = ${`data:${photo.type};base64,${base64}`}
    where id = ${itemId} and venue_id = ${venue.venueId}`;

  revalidatePath("/dashboard/menu");
  return { success: true };
}
