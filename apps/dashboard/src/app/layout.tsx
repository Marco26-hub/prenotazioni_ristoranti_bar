import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import { linguaUtente } from "@/lib/lingua";
import { tGuscio } from "@/i18n/guscio";
import "./globals.css";

/* Scaricati in fase di build e serviti dal nostro dominio: nessuna chiamata
   a Google dal browser del cliente, quindi niente da dichiarare nel banner
   cookie e nessun ritardo di rete al primo caricamento. */
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = tGuscio(await linguaUtente());
  return {
    title: t("app.titolo"),
    description: t("app.descrizione"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#17110d" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  /*
   * La lingua si decide qui, una volta sola, per tutto quello che sta sotto.
   *
   * `lang` non è decorazione: è quello che dice al lettore di schermo come
   * pronunciare la pagina e al motore di ricerca in che lingua è scritta. Il
   * provider serve ai componenti client, che altrimenti dovrebbero ricevere
   * la lingua come prop lungo tutto l'albero.
   */
  const lingua = await linguaUtente();

  return (
    <html lang={lingua} className={`h-full antialiased ${sans.variable} ${serif.variable}`}>
      <body className="flex min-h-full flex-col">
        <LinguaProvider lingua={lingua}>{children}</LinguaProvider>
      </body>
    </html>
  );
}
