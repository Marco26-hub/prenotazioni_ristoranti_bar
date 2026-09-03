import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { jsonLdSicuro } from "@repo/shared/json-ld";
import { testo, type TestiPubblici } from "@repo/shared/testi";
import { hasModulo } from "@repo/shared";
import { BookingForm } from "./booking-form";
import { Assistente } from "../../m/[slug]/assistente";

/**
 * Prenotazione pubblica: è la pagina che il ristoratore linka dal proprio
 * sito e dai profili social. Volutamente indicizzabile — "prenotare da X"
 * è una delle ricerche più frequenti su un locale, e questa pagina è la
 * risposta, con i dati strutturati che la rendono citabile.
 */

interface VenueRow {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  public_phone: string | null;
  public_email: string | null;
  address: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_province: string | null;
  subscription_status: string;
  subscription_period_end: Date | null;
  modules: string[] | null;
  opening_hours: string | null;
  assistant_enabled: boolean;
  public_texts: TestiPubblici | null;
}

async function loadVenue(slug: string): Promise<VenueRow | null> {
  const sql = db();
  const [venue] = await sql<VenueRow[]>`
    select id, name, logo_url, brand_color, public_phone, public_email,
           address, address_zip, address_city, address_province,
           subscription_status, subscription_period_end, modules,
           opening_hours, assistant_enabled, public_texts
      from venues where slug = ${slug}`;
  return venue ?? null;
}

export async function generateMetadata({
  params,
}: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const venue = await loadVenue(slug);
  if (!venue) return { title: "Locale non trovato" };

  const city = venue.address_city;
  const title = city
    ? `Prenota un tavolo da ${venue.name} — ${city}`
    : `Prenota un tavolo da ${venue.name}`;

  return {
    title,
    description: `Prenota online un tavolo da ${venue.name}${
      city ? ` a ${city}` : ""
    }. Scegli giorno, ora e numero di persone: la conferma arriva dal locale.`,
    alternates: { canonical: `/p/${slug}` },
    openGraph: { title, type: "website" },
  };
}

export default async function BookingPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const venue = await loadVenue(slug);
  if (!venue) notFound();

  const attivo = hasModulo(
    "prenotazioni",
    venue.subscription_status,
    venue.subscription_period_end,
    venue.modules
  );

  const address = [venue.address, venue.address_zip, venue.address_city, venue.address_province]
    .filter(Boolean)
    .join(" ");

  const benvenuto = testo(venue.public_texts, "prenota_benvenuto", {
    nome: venue.name,
  });

  // Schema.org: dice ai motori e agli assistenti che questo locale accetta
  // prenotazioni e da quale indirizzo si prenota.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: venue.name,
    acceptsReservations: attivo ? "True" : "False",
    ...(venue.public_phone ? { telephone: venue.public_phone } : {}),
    ...(venue.address_city
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: venue.address ?? undefined,
            postalCode: venue.address_zip ?? undefined,
            addressLocality: venue.address_city,
            addressRegion: venue.address_province ?? undefined,
            addressCountry: "IT",
          },
        }
      : {}),
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `/p/${slug}`,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      result: { "@type": "FoodEstablishmentReservation", name: `Tavolo da ${venue.name}` },
    },
  };

  return (
    <main
      className="mx-auto max-w-lg px-4 py-8"
      style={venue.brand_color ? ({ "--accent": venue.brand_color } as React.CSSProperties) : undefined}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSicuro(jsonLd) }}
      />

      <header className="mb-6 text-center">
        {venue.logo_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={venue.logo_url}
            alt=""
            className="mx-auto mb-3 h-16 w-16 rounded-xl object-contain"
          />
        )}
        <h1 className="text-2xl font-semibold tracking-tight">
          {testo(venue.public_texts, "prenota_titolo", { nome: venue.name })}
        </h1>
        {address && <p className="mt-1 text-sm text-muted">{address}</p>}
        {benvenuto && (
          <p className="mx-auto mt-3 max-w-prose whitespace-pre-line text-sm leading-relaxed text-muted">
            {benvenuto}
          </p>
        )}
        {venue.opening_hours && (
          <p className="mt-2 whitespace-pre-line text-sm text-muted">
            {venue.opening_hours}
          </p>
        )}
      </header>

      {attivo ? (
        <BookingForm slug={slug} venueName={venue.name} />
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5 text-center">
          <p className="font-medium">
            {testo(venue.public_texts, "prenota_chiuse_titolo", { nome: venue.name })}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm text-muted">
            {testo(venue.public_texts, "prenota_chiuse_testo", { nome: venue.name })}
          </p>
        </div>
      )}

      {venue.assistant_enabled && (
        <Assistente slug={slug} nomeLocale={venue.name} />
      )}

      <footer className="mt-8 space-y-2 text-center text-sm text-muted">
        {venue.public_phone && (
          <p>
            {testo(venue.public_texts, "prenota_telefono", { nome: venue.name })}{" "}
            <a
              href={`tel:${venue.public_phone}`}
              className="inline-block py-1.5 underline underline-offset-2"
            >
              {venue.public_phone}
            </a>
          </p>
        )}
        <p>
          <a href={`/m/${slug}`} className="inline-block py-1.5 underline underline-offset-2">
            {testo(venue.public_texts, "prenota_link_menu", { nome: venue.name })}
          </a>
        </p>
      </footer>
    </main>
  );
}
