import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { jsonLdSicuro } from "@repo/shared/json-ld";
import { testo, type TestiPubblici } from "@repo/shared/testi";
import { headers } from "next/headers";
import { scegliLingua, traduci, type Traduzioni } from "@repo/shared/lingue";
import { linguaUIPerContenuto, type LinguaUI } from "@repo/shared/i18n";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import { notaConservazioneTradotta } from "@repo/shared/i18n/comune";
import { tMenu } from "@/i18n/menu";
import { type Conservazione } from "@repo/shared/bevande";
import { SelettoreLingua } from "./selettore-lingua";
import { Assistente } from "./assistente";
import { AnnuncioLocale } from "../../v/[slug]/t/[token]/annuncio";
import { annuncioAttivo } from "@/lib/annuncio";
import { linguaPagina } from "@/lib/lingua";
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
  lingua_predefinita: string;
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
           languages, lingua_predefinita, opening_hours, practical_info, assistant_enabled,
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

/**
 * Le due lingue della pagina, decise da un parametro solo.
 *
 * `?lang=` comanda il contenuto — i piatti, nelle lingue che il locale ha
 * tradotto — e insieme l'interfaccia, che di lingue ne ha due. Un tedesco
 * che chiede il menu in tedesco legge i piatti in tedesco e i pulsanti in
 * inglese: è il meglio che possiamo dargli, e batte i pulsanti in italiano.
 *
 * L'interfaccia guarda la richiesta e non la lingua risolta: chi tocca
 * "English" su un locale che non ha tradotto niente deve comunque leggere
 * l'interfaccia in inglese, anche se i piatti restano in italiano.
 */
async function lingueDellaPagina(
  richiesta: string | undefined,
  disponibili: string[],
  /** `venues.lingua_predefinita`: conta solo quando il telefono non aiuta. */
  predefinitaLocale?: string | null
): Promise<{ contenuto: string; ui: LinguaUI }> {
  // La lingua chiesta esplicitamente vince sul browser; il browser vince
  // sull'italiano. Solo fra quelle che il locale ha davvero tradotto.
  const accept = (await headers()).get("accept-language");
  const contenuto = scegliLingua(richiesta, accept, disponibili);

  if (richiesta) return { contenuto, ui: linguaUIPerContenuto(richiesta) };
  if (contenuto !== "it") return { contenuto, ui: linguaUIPerContenuto(contenuto) };

  // Nessuna richiesta e carta in italiano: restano il cookie della scelta
  // fatta prima e la lingua del telefono, che è quello che guarda
  // `linguaPagina`.
  return { contenuto, ui: await linguaPagina(null, predefinitaLocale) };
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/m/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const richiesta = Array.isArray(sp.lang) ? sp.lang[0] : sp.lang;

  const data = await loadVenue(slug);
  if (!data) return { title: tMenu(linguaUIPerContenuto(richiesta))("meta.non_trovato") };

  const { contenuto, ui } = await lingueDellaPagina(
    richiesta,
    data.venue.languages ?? [],
    data.venue.lingua_predefinita
  );
  const t = tMenu(ui);

  const city = data.venue.address_city;
  const title = city
    ? t("meta.titolo.citta", { nome: data.venue.name, citta: city })
    : t("meta.titolo", { nome: data.venue.name });
  // Gli esempi sono nomi di piatti: vanno nella lingua in cui la pagina li
  // mostra, o la scheda nei risultati promette un menu che non c'è.
  const sample = data.items
    .slice(0, 4)
    .map((i) => traduci(i, i.translations, contenuto).name)
    .join(", ");

  return {
    title,
    description: sample
      ? city
        ? t("meta.descrizione", { nome: data.venue.name, citta: city, esempi: sample })
        : t("meta.descrizione.senza_citta", { nome: data.venue.name, esempi: sample })
      : t("meta.descrizione.breve", { nome: data.venue.name }),
    alternates: { canonical: `/m/${slug}` },
    openGraph: {
      title,
      type: "website",
      description: t("meta.og.descrizione", { nome: data.venue.name }),
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

  const sp = await searchParams;
  const richiesta = Array.isArray(sp.lang) ? sp.lang[0] : sp.lang;
  const { contenuto: lingua, ui: linguaUI } = await lingueDellaPagina(
    richiesta,
    venue.languages ?? [],
    venue.lingua_predefinita
  );
  const t = tMenu(linguaUI);

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
  const notaLegale = notaConservazioneTradotta(
    items.map((i) => i.conservation),
    linguaUI
  );

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
      name: t("jsonld.menu", { nome: venue.name }),
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
    <LinguaProvider lingua={linguaUI}>
      {/* `lang` dell'interfaccia sul guscio: il layout non sa di che locale
          è questa pagina, quindi non conosce la lingua che il locale ha
          scelto per sé. I nomi dei piatti possono essere in un'altra lingua
          ancora — quelli li marca la loro sezione. */}
      <div
        lang={linguaUI}
        id="inizio"
        className="menu-shell flex min-h-full flex-col"
        style={brandStyle}
      >
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
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    {t("intestazione.menu")}
                  </p>
                  <h1 className="text-2xl font-semibold text-pretty sm:text-3xl">{venue.name}</h1>
                  {address && <p className="mt-1 text-sm text-muted">{address}</p>}
                </div>
              </div>
              <TemaMenu />
            </div>

            <div className="mt-6">
              <SelettoreLingua
                base={`/m/${slug}`}
                attiva={richiesta ?? lingua}
                disponibili={venue.languages ?? []}
                lingua={linguaUI}
              />
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
          aria-label={t("informazioni.aria")}
          className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 pt-10 sm:px-6"
        >
          <h2 className="text-xl font-semibold">{t("informazioni.titolo")}</h2>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t("informazioni.orari")}
              </h3>
              <p className="mt-1 whitespace-pre-line leading-relaxed">
                {venue.opening_hours ?? t("informazioni.orari.assenti")}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t("informazioni.dove")}
              </h3>
              <p className="mt-1 leading-relaxed">{address || venue.name}</p>
              {address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${address}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block py-1.5 text-sm underline underline-offset-2"
                >
                  {t("informazioni.indicazioni")}
                </a>
              )}
            </div>

            {venue.practical_info && (
              <div className="sm:col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t("informazioni.pratiche")}
                </h3>
                <p className="mt-1 whitespace-pre-line leading-relaxed">
                  {venue.practical_info}
                </p>
              </div>
            )}

            {(venue.public_phone || venue.public_email) && (
              <div className="sm:col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t("informazioni.contatti")}
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
            {t("piede.allergeni")}
          </p>
          <div className="grid gap-8 border-t border-border py-8 text-sm sm:grid-cols-3">
            <section aria-labelledby="footer-locale">
              <h2 id="footer-locale" className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {t("piede.locale")}
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
                  {t("informazioni.indicazioni")}
                </a>
              )}
            </section>

            <section aria-labelledby="footer-contatti">
              <h2 id="footer-contatti" className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {t("piede.contatti")}
              </h2>
              <div className="space-y-1 text-muted">
                {venue.public_phone ? (
                  <p>
                    <a href={`tel:${venue.public_phone}`} className="inline-block py-1.5 underline underline-offset-4">
                      {t("piede.chiama", { numero: venue.public_phone })}
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

            <nav aria-label={t("piede.legali")}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {t("piede.informazioni")}
              </h2>
              <ul className="space-y-1 text-muted">
                <li><a href={`/privacy/${slug}`} className="inline-block py-1.5 underline underline-offset-4">{t("piede.privacy")}</a></li>
                <li><a href="/termini" className="inline-block py-1.5 underline underline-offset-4">{t("piede.termini")}</a></li>
                <li><a href="/cookie" className="inline-block py-1.5 underline underline-offset-4">{t("piede.cookie")}</a></li>
                <li><a href="#inizio" className="inline-block py-1.5 font-medium text-accent underline underline-offset-4">{t("piede.inizio")}</a></li>
              </ul>
            </nav>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-5 text-xs text-muted">
            <p>© {new Date().getFullYear()} {venue.name}</p>
            <p className="whitespace-pre-line">{testo(venue.public_texts, "menu_nota", { nome: venue.name })}</p>
          </div>
        </footer>
      </div>
    </LinguaProvider>
  );
}
