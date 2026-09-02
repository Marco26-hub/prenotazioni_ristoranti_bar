import type { MetadataRoute } from "next";

/**
 * I menu pubblici (/m/...) vanno indicizzati: sono il contenuto che porta
 * visibilità al locale. Le pagine tavolo (/v/...) no — contengono il token
 * stampato sul QR, e in un risultato di ricerca sarebbe sia inutile sia
 * un modo per aprire un conto senza essere al tavolo.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ristoranti-guest.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/m/"],
        disallow: ["/v/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
