"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";

export interface AnnuncioResult {
  error?: string;
  success?: string;
}

/**
 * L'immagine dell'annuncio è più grande di quella di un piatto — occupa
 * mezza schermata — ma resta una data URL in colonna come il logo. Il
 * limite serve al cliente al tavolo, spesso su rete mobile: un banner da
 * due megabyte ritarda l'apertura del menu invece di promuovere qualcosa.
 */
const MAX_IMMAGINE_BYTES = 500 * 1024;
const TIPI_AMMESSI = ["image/jpeg", "image/png", "image/webp"];

/** Un `javascript:` qui diventerebbe codice nel browser di ogni cliente. */
function urlSicuro(valore: string): string | null {
  if (!valore) return null;
  try {
    const u = new URL(valore);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function testo(formData: FormData, chiave: string, max: number): string | null {
  const v = String(formData.get(chiave) ?? "").trim();
  return v === "" ? null : v.slice(0, max);
}

function data(formData: FormData, chiave: string): Date | null {
  const v = String(formData.get(chiave) ?? "").trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function salvaAnnuncio(formData: FormData): Promise<AnnuncioResult> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const attivo = formData.get("enabled") === "on";
  const titolo = testo(formData, "title", 80);

  if (attivo && !titolo) {
    return { error: "Serve almeno un titolo per mostrare l'annuncio" };
  }

  const ctaUrlGrezzo = String(formData.get("ctaUrl") ?? "").trim();
  const ctaUrl = ctaUrlGrezzo ? urlSicuro(ctaUrlGrezzo) : null;
  if (ctaUrlGrezzo && !ctaUrl) {
    return { error: "Il link del bottone deve iniziare per http:// o https://" };
  }

  const inizio = data(formData, "startsAt");
  const fine = data(formData, "endsAt");
  if (inizio && fine && fine.getTime() <= inizio.getTime()) {
    return { error: "La data di fine deve venire dopo quella di inizio" };
  }

  // --- Immagine: caricamento, rimozione, oppure si tiene quella che c'è ---
  let immagine: string | null | undefined;

  if (formData.get("removeImage") === "on") {
    immagine = null;
  } else {
    const file = formData.get("image");
    if (file instanceof File && file.size > 0) {
      if (!TIPI_AMMESSI.includes(file.type)) {
        return { error: "Formato non supportato: usa JPG, PNG o WEBP" };
      }
      if (file.size > MAX_IMMAGINE_BYTES) {
        return { error: "Immagine troppo pesante (massimo 500 KB)" };
      }
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      immagine = `data:${file.type};base64,${base64}`;
    }
  }

  // La versione cambia solo quando cambia ciò che il cliente legge: alzarla
  // a ogni salvataggio ripresenterebbe l'annuncio anche a chi l'ha già
  // chiuso, per una correzione di refuso o uno spostamento di data.
  const [precedente] = await sql<
    {
      announcement_title: string | null;
      announcement_body: string | null;
      announcement_image_url: string | null;
      announcement_cta_label: string | null;
      announcement_cta_url: string | null;
    }[]
  >`select announcement_title, announcement_body, announcement_image_url,
           announcement_cta_label, announcement_cta_url
      from venues where id = ${venue.venueId}`;

  const corpo = testo(formData, "body", 600);
  const ctaEtichetta = testo(formData, "ctaLabel", 40);
  const immagineFinale =
    immagine === undefined ? (precedente?.announcement_image_url ?? null) : immagine;

  const cambiato =
    precedente?.announcement_title !== titolo ||
    precedente?.announcement_body !== corpo ||
    precedente?.announcement_image_url !== immagineFinale ||
    precedente?.announcement_cta_label !== ctaEtichetta ||
    precedente?.announcement_cta_url !== ctaUrl;

  await sql`
    update venues set
      announcement_title = ${titolo},
      announcement_body = ${corpo},
      announcement_image_url = ${immagineFinale},
      announcement_cta_label = ${ctaEtichetta},
      announcement_cta_url = ${ctaUrl},
      announcement_starts_at = ${inizio},
      announcement_ends_at = ${fine},
      announcement_enabled = ${attivo},
      announcement_version = announcement_version + ${cambiato ? 1 : 0}
    where id = ${venue.venueId}`;

  revalidatePath("/dashboard/settings");

  if (!attivo) return { success: "Salvato. L'annuncio non è mostrato ai clienti." };
  if (fine && fine.getTime() < Date.now()) {
    return { success: "Salvato, ma la data di fine è già passata: non comparirà." };
  }
  if (inizio && inizio.getTime() > Date.now()) {
    return { success: "Salvato. Comparirà alla data di inizio indicata." };
  }
  return { success: "Salvato. I clienti lo vedono aprendo il menu." };
}
