"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tImpostazioni } from "@/i18n/impostazioni";

export interface BrandResult {
  error?: string;
  success?: boolean;
}

const MAX_LOGO_BYTES = 200 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function saveBranding(formData: FormData): Promise<BrandResult> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tImpostazioni(await linguaUtente());

  const displayName = String(formData.get("displayName") ?? "").trim();
  const brandColor = String(formData.get("brandColor") ?? "").trim();
  const publicPhone = String(formData.get("publicPhone") ?? "").trim() || null;
  const publicEmail = String(formData.get("publicEmail") ?? "").trim() || null;
  const removeLogo = formData.get("removeLogo") === "on";
  const tipsEnabled = formData.get("tipsEnabled") === "on";
  const googleReviewUrl = String(formData.get("googleReviewUrl") ?? "").trim() || null;

  const tipPercents = String(formData.get("tipPercents") ?? "")
    .split(",")
    .map((p) => Number.parseInt(p.trim(), 10))
    .filter((p) => Number.isFinite(p) && p > 0 && p <= 100)
    .slice(0, 4);
  const logo = formData.get("logo");

  if (!displayName) return { error: t("brand.errore.nome") };
  if (tipsEnabled && tipPercents.length === 0) {
    return { error: t("brand.errore.mancia") };
  }
  if (googleReviewUrl && !/^https?:\/\//.test(googleReviewUrl)) {
    return { error: t("brand.errore.recensioni") };
  }
  if (brandColor && !/^#[0-9a-fA-F]{6}$/.test(brandColor)) {
    return { error: t("brand.errore.colore") };
  }

  let logoDataUrl: string | null | undefined;

  if (removeLogo) {
    logoDataUrl = null;
  } else if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_TYPES.includes(logo.type)) {
      return { error: t("brand.errore.logo.formato") };
    }
    if (logo.size > MAX_LOGO_BYTES) {
      return { error: t("brand.errore.logo.peso") };
    }
    const base64 = Buffer.from(await logo.arrayBuffer()).toString("base64");
    logoDataUrl = `data:${logo.type};base64,${base64}`;
  }

  const sql = db();

  // Il logo si aggiorna solo se ne è stato caricato uno nuovo o se è stata
  // chiesta la rimozione: un submit senza file non deve cancellarlo.
  if (logoDataUrl === undefined) {
    await sql`
      update venues set name = ${displayName}, brand_color = ${brandColor || null},
        public_phone = ${publicPhone}, public_email = ${publicEmail},
        tips_enabled = ${tipsEnabled}, tip_percents = ${tipPercents},
        google_review_url = ${googleReviewUrl}
      where id = ${venue.venueId}`;
  } else {
    await sql`
      update venues set name = ${displayName}, brand_color = ${brandColor || null},
        public_phone = ${publicPhone}, public_email = ${publicEmail},
        tips_enabled = ${tipsEnabled}, tip_percents = ${tipPercents},
        google_review_url = ${googleReviewUrl}, logo_url = ${logoDataUrl}
      where id = ${venue.venueId}`;
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}
