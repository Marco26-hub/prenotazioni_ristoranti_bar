import "server-only";
import { db } from "@repo/shared/db";
import type { Annuncio } from "@/app/v/[slug]/t/[token]/annuncio";

interface Riga {
  announcement_title: string | null;
  announcement_body: string | null;
  announcement_image_url: string | null;
  announcement_cta_label: string | null;
  announcement_cta_url: string | null;
  announcement_starts_at: Date | null;
  announcement_ends_at: Date | null;
  announcement_enabled: boolean;
  announcement_version: number;
}

/**
 * Il ristoratore incolla un indirizzo qualunque. Un `javascript:` in quel
 * campo diventerebbe codice eseguito nel browser di ogni suo cliente al
 * primo tocco sul bottone: qui passano solo http e https.
 */
function urlSicuro(valore: string | null): string | null {
  if (!valore) return null;
  try {
    const u = new URL(valore);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Annuncio attivo del locale, o null.
 *
 * Le finestre di validità sono aperte da entrambi i lati: un annuncio senza
 * date vale sempre, uno con la sola fine vale fino a quella data. È il modo
 * in cui un ristoratore ragiona — "fino a domenica" — senza doversi
 * inventare anche una data di inizio.
 */
export async function annuncioAttivo(venueId: string): Promise<Annuncio | null> {
  const sql = db();
  const [r] = await sql<Riga[]>`
    select announcement_title, announcement_body, announcement_image_url,
           announcement_cta_label, announcement_cta_url,
           announcement_starts_at, announcement_ends_at,
           announcement_enabled, announcement_version
      from venues where id = ${venueId}`;

  if (!r?.announcement_enabled || !r.announcement_title) return null;

  const ora = Date.now();
  if (r.announcement_starts_at && r.announcement_starts_at.getTime() > ora) return null;
  if (r.announcement_ends_at && r.announcement_ends_at.getTime() < ora) return null;

  const ctaUrl = urlSicuro(r.announcement_cta_url);

  return {
    titolo: r.announcement_title,
    testo: r.announcement_body,
    immagine: r.announcement_image_url,
    // Un bottone senza destinazione valida non va mostrato: sembrerebbe
    // rotto proprio nel momento in cui il locale sta promuovendo qualcosa.
    ctaEtichetta: ctaUrl ? r.announcement_cta_label : null,
    ctaUrl,
    versione: r.announcement_version,
  };
}
