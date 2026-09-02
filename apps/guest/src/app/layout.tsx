import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ordina al tavolo",
  description: "Consulta il menu, ordina e paga dal tuo telefono.",
};

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
