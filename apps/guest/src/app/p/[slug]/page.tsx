import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { jsonLdSicuro } from "@repo/shared/json-ld";
import { testo, type TestiPubblici } from "@repo/shared/testi";
import { hasModulo } from "@repo/shared";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import { linguaPagina } from "@/lib/lingua";
import { tPrenota } from "@/i18n/prenota";
import { SelettoreLinguaUI } from "../../_i18n/selettore";
import { BookingForm } from "./booking-form";
import { Assistente } from "../../m/[slug]/assistente";

/**
 * Prenotazione pubblica: è la pagina che il ristoratore linka dal proprio
 * sito e dai profili social. Volutamente indicizzabile — "prenotare da X"
 * è una delle ricerche più frequenti su un locale, e questa pagina è la
 * risposta, con i dati strutturati che la rendono citabile.
 */

interface VenueRow {
  lingua_predefinita: string;
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
           opening_hours, assistant_enabled, public_texts, lingua_predefinita
      from venues where slug = ${slug}`;
  return venue ?? null;
}

/**
 * I testi di questa pagina il ristoratore può riscriverli: quelli sono suoi
 * e restano nella lingua in cui li ha scritti. Solo il ripiego — quello che
 * compare quando non ha scritto niente — è nostro, e quello lo traduciamo.
 */
function suoOppureNostro(
  testi: TestiPubblici | null,
  chiave: string,
  nostro: string,
  nome: string
): string {
  const suo = (testi?.[chiave] ?? "").trim();
  return suo ? testo(testi, chiave, { nome }) : nostro;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  // Il locale prima della lingua: la sua preferenza è l'ultimo ripiego, e
  // senza averlo letto non si potrebbe passare.
  const venue = await loadVenue(slug);
  const t = tPrenota(await linguaPagina(lang, venue?.lingua_predefinita));
  if (!venue) return { title: t("meta.non_trovato") };

  const city = venue.address_city;
  const title = city
    ? t("meta.titolo.citta", { nome: venue.name, citta: city })
    : t("meta.titolo", { nome: venue.name });

  return {
    title,
    description: city
      ? t("meta.descrizione.citta", { nome: venue.name, citta: city })
      : t("meta.descrizione", { nome: venue.name }),
    alternates: { canonical: `/p/${slug}` },
    openGraph: { title, type: "website" },
  };
}

export default async function BookingPage({
  params,
  searchParams,
}: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const venue = await loadVenue(slug);
  const lingua = await linguaPagina(lang, venue?.lingua_predefinita);
  const t = tPrenota(lingua);
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
      result: {
        "@type": "FoodEstablishmentReservation",
        name: t("jsonld.tavolo", { nome: venue.name }),
      },
    },
  };

  return (
    <LinguaProvider lingua={lingua}>
      {/* Vedi la pagina tavolo: il layout non conosce il locale, quindi non
          può sapere la lingua che il locale ha scelto per sé. */}
      <main
        lang={lingua}
        className="mx-auto max-w-lg px-4 py-8"
        style={venue.brand_color ? ({ "--accent": venue.brand_color } as React.CSSProperties) : undefined}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSicuro(jsonLd) }}
        />

        <div className="mb-4 flex justify-end">
          <SelettoreLinguaUI attiva={lingua} />
        </div>

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
            {suoOppureNostro(
              venue.public_texts,
              "prenota_titolo",
              t("prenota.titolo", { nome: venue.name }),
              venue.name
            )}
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
              {suoOppureNostro(
                venue.public_texts,
                "prenota_chiuse_titolo",
                t("prenota.chiuse.titolo"),
                venue.name
              )}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">
              {suoOppureNostro(
                venue.public_texts,
                "prenota_chiuse_testo",
                t("prenota.chiuse.testo"),
                venue.name
              )}
            </p>
          </div>
        )}

        {venue.assistant_enabled && (
          <Assistente slug={slug} nomeLocale={venue.name} />
        )}

        <footer className="mt-8 space-y-2 text-center text-sm text-muted">
          {venue.public_phone && (
            <p>
              {suoOppureNostro(
                venue.public_texts,
                "prenota_telefono",
                t("prenota.telefono"),
                venue.name
              )}{" "}
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
              {suoOppureNostro(
                venue.public_texts,
                "prenota_link_menu",
                t("prenota.link_menu"),
                venue.name
              )}
            </a>
          </p>
        </footer>
      </main>
    </LinguaProvider>
  );
}
