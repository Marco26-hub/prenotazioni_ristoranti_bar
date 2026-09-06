import type { Metadata, Viewport } from "next";
import { linguaPagina } from "@/lib/lingua";
import { tLegale } from "@/i18n/legale";
import "./globals.css";

/**
 * Il layout non riceve `searchParams`, quindi la lingua qui si decide solo su
 * cookie e Accept-Language: il `?lang=` del link lo gestisce la pagina. Basta,
 * perché quello che si decide qui è l'attributo `lang` dell'`<html>` e il
 * titolo della scheda, non il testo che il cliente legge.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = tLegale(await linguaPagina());
  return {
    title: t("app.titolo"),
    description: t("app.descrizione"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Il cliente sta in piedi al tavolo con una mano sola: niente zoom
  // accidentale, ma lo zoom manuale resta possibile per accessibilità.
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#17110d" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // `lang` non è decorazione: è quello che dice al lettore di schermo come
  // pronunciare la pagina e al motore di ricerca in che lingua è scritta.
  const lingua = await linguaPagina();

  return (
    <html lang={lingua} className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
