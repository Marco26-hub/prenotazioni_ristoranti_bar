import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { jsonLdSicuro } from "@repo/shared/json-ld";
import { testo, type TestiPubblici } from "@repo/shared/testi";
import { headers } from "next/headers";
import { scegliLingua, traduci, type Traduzioni } from "@repo/shared/lingue";
import { notaConservazione, type Conservazione } from "@repo/shared/bevande";
import { SelettoreLingua } from "./selettore-lingua";
import { Assistente } from "./assistente";
import { AnnuncioLocale } from "../../v/[slug]/t/[token]/annuncio";
import { annuncioAttivo } from "@/lib/annuncio";
import { MenuCategories } from "./menu-categories";
import { TemaMenu } from "./tema-menu";
import { hasModulo } from "@repo/shared";

/**
 * Menu pubblico del locale, indicizzabile.
 *
 * Le pagine tavolo (/v/...) sono volutamente escluse dai motori: contengono
 * il token del QR e non hanno senso in una ricerca. Questa invece è il menu
 * come contenuto pubblico — è ciò che le persone cercano davvero ("cosa si
 * mangia da X") e ciò che gli assistenti AI citano, quindi porta visibilità
 * al locale senza esporre nulla.
 */

interface PublicMenuItem {
  id: string;
  translations?: Traduzioni;
  category_id: string | null;
  name: string;
  description: string | null;
  ingredients: string | null;
  price_cents: number;
  ha_foto: boolean;
  // Obbligatori per legge sul menu: allergeni (Reg. UE 1169/2011) e stato
  // di conservazione (D.Lgs. 109/1992, Reg. CE 853/2004 per il crudo).
  allergens: string[] | null;
  dietary_tags: string[] | null;
  conservation: Conservazione;
  origin_note: string | null;
  kind: string;
  producer: string | null;
  vintage: number | null;
  denomination: string | null;
  origin: string | null;
  abv: string | null;
  serving_note: string | null;
}

interface VenuePublic {
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
  currency: string;
  languages: string[];
  opening_hours: string | null;
  practical_info: string | null;
  assistant_enabled: boolean;
  subscription_status: string;
  subscription_period_end: Date | null;
  modules: string[] | null;
  public_texts: TestiPubblici | null;
}


async function loadVenue(slug: string) {
  const sql = db();
  const [venue] = await sql<VenuePublic[]>`
    select id, name, logo_url, brand_color, public_phone, public_email,
           address, address_zip, address_city, address_province, currency,
           languages, opening_hours, practical_info, assistant_enabled,
           subscription_status, subscription_period_end, modules, public_texts
    from venues where slug = ${slug}`;
  if (
    !venue ||
    !hasModulo("ordini", venue.subscription_status, venue.subscription_period_end, venue.modules)
  ) return null;

  const categories = await sql<{ id: string; name: string; translations: Traduzioni }[]>`
    select id, name, translations from menu_categories where venue_id = ${venue.id}
     order by sort_order`;

  const items = await sql<PublicMenuItem[]>`
    select id, category_id, name, description, ingredients, price_cents,
           translations, allergens, dietary_tags, conservation, origin_note,
           kind, producer, vintage, denomination, origin, abv, serving_note,
           (image_url is not null) as ha_foto
    from menu_items
    where venue_id = ${venue.id} and available = true
    order by sort_order`;

  return { venue, categories, items };
}

export async function generateMetadata({
  params,
}: PageProps<"/m/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadVenue(slug);
  if (!data) return { title: "Menu non trovato" };

  const city = data.venue.address_city;
  const title = city ? `Menu di ${data.venue.name} — ${city}` : `Menu di ${data.venue.name}`;
  const sample = data.items.slice(0, 4).map((i) => i.name).join(", ");

  return {
    title,
    description: sample
      ? `Il menu aggiornato di ${data.venue.name}${city ? ` a ${city}` : ""}: ${sample} e altro, con i prezzi.`
      : `Il menu di ${data.venue.name}.`,
    alternates: { canonical: `/m/${slug}` },
    openGraph: {
      title,
      type: "website",
      description: `Menu e prezzi di ${data.venue.name}.`,
    },
  };
}

export default async function PublicMenuPage({
  params,
  searchParams,
}: PageProps<"/m/[slug]">) {
  const { slug } = await params;
  const data = await loadVenue(slug);
  if (!data) notFound();

  const { venue, categories: categorieBase, items: itemsBase } = data;
  const annuncio = await annuncioAttivo(venue.id);

  // La lingua chiesta esplicitamente vince sul browser; il browser vince
  // sull'italiano. Solo fra quelle che il locale ha davvero tradotto.
  const sp = await searchParams;
  const richiesta = Array.isArray(sp.lang) ? sp.lang[0] : sp.lang;
  const accept = (await headers()).get("accept-language");
  const lingua = scegliLingua(richiesta, accept, venue.languages ?? []);

  const categories = categorieBase.map((c) => traduci(c, c.translations, lingua));
  const items = itemsBase.map((i) => traduci(i, i.translations, lingua));

  const itemsByCategory = new Map<string | null, PublicMenuItem[]>();
  for (const item of items) {
    const key = item.category_id;
    if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
    itemsByCategory.get(key)!.push(item);
  }

  const address = [venue.address, venue.address_zip, venue.address_city, venue.address_province]
    .filter(Boolean)
    .join(" ");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ristoranti-guest.vercel.app";

  // Costruita su ciò che c'è davvero: una nota che dichiara surgelati dove
  // non ce ne sono è falsa quanto ometterli dove ci sono.
  const notaLegale = notaConservazione(items.map((i) => i.conservation));

  // Schema.org Restaurant + Menu: è ciò che permette a Google di mostrare il
  // menu come dato strutturato e agli assistenti AI di citarlo con i prezzi
  // giusti invece di indovinare.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: venue.name,
    ...(venue.public_phone ? { telephone: venue.public_phone } : {}),
    ...(venue.public_email ? { email: venue.public_email } : {}),
    ...(venue.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: venue.address,
            postalCode: venue.address_zip ?? undefined,
            addressLocality: venue.address_city ?? undefined,
            addressRegion: venue.address_province ?? undefined,
            addressCountry: "IT",
          },
        }
      : {}),
    hasMenu: {
      "@type": "Menu",
      name: `Menu di ${venue.name}`,
      hasMenuSection: categories
        .map((cat) => ({
          "@type": "MenuSection",
          name: cat.name,
          hasMenuItem: (itemsByCategory.get(cat.id) ?? []).map((i) => ({
            "@type": "MenuItem",
            name: i.name,
            ...(i.description ? { description: i.description } : {}),
            // Nei dati strutturati serve un indirizzo assoluto: un data
            // URL lì dentro non è utilizzabile da nessun consumatore.
            ...(i.ha_foto ? { image: `${base}/api/foto/${i.id}` } : {}),
            offers: {
              "@type": "Offer",
              price: (i.price_cents / 100).toFixed(2),
              priceCurrency: venue.currency,
            },
          })),
        }))
        .filter((s) => s.hasMenuItem.length > 0),
    },
  };

  const brandStyle = venue.brand_color
    ? ({ "--accent": venue.brand_color } as React.CSSProperties)
    : undefined;

  const categorieConVoci = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      items: (itemsByCategory.get(category.id) ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        ingredients: item.ingredients,
        priceCents: item.price_cents,
        imageUrl: item.ha_foto ? `/api/foto/${item.id}` : null,
        allergens: item.allergens,
        dietaryTags: item.dietary_tags,
        conservation: item.conservation,
        originNote: item.origin_note,
        kind: item.kind,
        producer: item.producer,
        vintage: item.vintage,
        denomination: item.denomination,
        origin: item.origin,
        abv: item.abv,
        servingNote: item.serving_note,
      })),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div id="inizio" className="menu-shell flex min-h-full flex-col" style={brandStyle}>
      {annuncio && <AnnuncioLocale annuncio={annuncio} venueSlug={slug} />}

      {venue.assistant_enabled && (
        <Assistente slug={slug} nomeLocale={venue.name} />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSicuro(jsonLd) }}
      />

      <header className="menu-header border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
          <div className="flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              {venue.logo_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={venue.logo_url}
                  alt=""
                  width={72}
                  height={72}
                  className="h-16 w-16 shrink-0 rounded-lg object-contain sm:h-18 sm:w-18"
                />
              )}
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Menu</p>
                <h1 className="text-2xl font-semibold text-pretty sm:text-3xl">{venue.name}</h1>
                {address && <p className="mt-1 text-sm text-muted">{address}</p>}
              </div>
            </div>
            <TemaMenu />
          </div>

          <div className="mt-6">
            <SelettoreLingua base={`/m/${slug}`} attiva={lingua} disponibili={venue.languages ?? []} />
          </div>
        </div>
      </header>

      <MenuCategories categories={categorieConVoci} currency={venue.currency} />

      {/* La linguetta "Info" portava direttamente al piè di pagina, che ha
          soltanto i link legali: sembrava non contenere niente. Qui c'è la
          sezione che quella linguetta promette — orari, indicazioni pratiche,
          dove siamo, come chiamare — e il piè di pagina torna a fare il piè
          di pagina. */}
      <section
        id="informazioni"
        aria-label="Informazioni sul locale"
        className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 pt-10 sm:px-6"
      >
        <h2 className="text-xl font-semibold">Informazioni</h2>

        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Orari
            </h3>
            <p className="mt-1 whitespace-pre-line leading-relaxed">
              {venue.opening_hours ?? "Chiedi al locale: gli orari non sono indicati."}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Dove siamo
            </h3>
            <p className="mt-1 leading-relaxed">{address || venue.name}</p>
            {address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${address}`)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block py-1.5 text-sm underline underline-offset-2"
              >
                Apri le indicazioni
              </a>
            )}
          </div>

          {venue.practical_info && (
            <div className="sm:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Buono a sapersi
              </h3>
              <p className="mt-1 whitespace-pre-line leading-relaxed">
                {venue.practical_info}
              </p>
            </div>
          )}

          {(venue.public_phone || venue.public_email) && (
            <div className="sm:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Contatti
              </h3>
              <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                {venue.public_phone && (
                  <a href={`tel:${venue.public_phone}`} className="py-1.5 underline underline-offset-2">
                    {venue.public_phone}
                  </a>
                )}
                {venue.public_email && (
                  <a href={`mailto:${venue.public_email}`} className="py-1.5 underline underline-offset-2">
                    {venue.public_email}
                  </a>
                )}
              </p>
            </div>
          )}
        </div>
      </section>

      <footer className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 pb-10 pt-2 sm:px-6">
        {notaLegale && (
          <p className="border-t border-border pt-6 text-xs leading-relaxed text-muted">
            {notaLegale}
          </p>
        )}
        <p className="pt-3 text-xs leading-relaxed text-muted">
          Per allergie e intolleranze chiedi sempre al personale prima di
          ordinare: le informazioni sugli allergeni sono riportate su ogni
          piatto ai sensi del Reg. UE 1169/2011.
        </p>
        <div className="grid gap-8 border-t border-border py-8 text-sm sm:grid-cols-3">
          <section aria-labelledby="footer-locale">
            <h2 id="footer-locale" className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Il locale
            </h2>
            <p className="font-semibold text-foreground">{venue.name}</p>
            {address && <p className="mt-2 leading-relaxed text-muted">{address}</p>}
            {address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block py-1 font-medium text-accent underline underline-offset-4"
              >
                Apri le indicazioni
              </a>
            )}
          </section>

          <section aria-labelledby="footer-contatti">
            <h2 id="footer-contatti" className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Contatti
            </h2>
            <div className="space-y-1 text-muted">
              {venue.public_phone ? (
                <p>
                  <a href={`tel:${venue.public_phone}`} className="inline-block py-1.5 underline underline-offset-4">
                    Chiama {venue.public_phone}
                  </a>
                </p>
              ) : (
                <p>{testo(venue.public_texts, "menu_contatti", { nome: venue.name })}</p>
              )}
              {venue.public_email && (
                <p>
                  <a href={`mailto:${venue.public_email}`} className="inline-block break-all py-1.5 underline underline-offset-4">
                    {venue.public_email}
                  </a>
                </p>
              )}
            </div>
          </section>

          <nav aria-label="Informazioni legali">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Informazioni
            </h2>
            <ul className="space-y-1 text-muted">
              <li><a href={`/privacy/${slug}`} className="inline-block py-1.5 underline underline-offset-4">Privacy del locale</a></li>
              <li><a href="/termini" className="inline-block py-1.5 underline underline-offset-4">Termini di servizio</a></li>
              <li><a href="/cookie" className="inline-block py-1.5 underline underline-offset-4">Informativa cookie</a></li>
              <li><a href="#inizio" className="inline-block py-1.5 font-medium text-accent underline underline-offset-4">Torna all&apos;inizio</a></li>
            </ul>
          </nav>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-5 text-xs text-muted">
          <p>© {new Date().getFullYear()} {venue.name}</p>
          <p className="whitespace-pre-line">{testo(venue.public_texts, "menu_nota", { nome: venue.name })}</p>
        </div>
      </footer>
    </div>
  );
}
