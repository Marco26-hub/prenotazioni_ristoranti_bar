import type { MetadataRoute } from "next";
import { db } from "@repo/shared/db";

/**
 * Generato a ogni richiesta, non in fase di build: altrimenti il deploy
 * dipenderebbe dalla raggiungibilità del database, e un'indisponibilità
 * momentanea farebbe fallire l'intera pubblicazione. I crawler lo leggono
 * di rado, il costo per richiesta è irrilevante.
 */
export const dynamic = "force-dynamic";

/** Un'entrata per ogni locale che ha almeno un piatto pubblicato. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ristoranti-guest.vercel.app";

  const sql = db();
  const venues = await sql<{ slug: string }[]>`
    select distinct v.slug
    from venues v
    join menu_items mi on mi.venue_id = v.id and mi.available = true`;

  return [
    { url: base, changeFrequency: "monthly", priority: 0.5 },
    ...venues.flatMap((v) => [
      {
        url: `${base}/m/${v.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      // "Prenotare da X" è una ricerca almeno quanto "menu di X": la pagina
      // di prenotazione va indicizzata insieme al menu, non lasciata fuori.
      {
        url: `${base}/p/${v.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      },
    ]),
  ];
}
