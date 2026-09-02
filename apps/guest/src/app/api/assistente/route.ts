import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";
import { decryptSecret } from "@repo/shared/crypto";
import { MODELLO_PREDEFINITO } from "@repo/shared/openrouter-tipi";
import { formatPriceCents } from "@repo/shared";

/**
 * Assistente sulle pagine pubbliche del locale.
 *
 * Risponde solo con quello che il locale ha davvero scritto: menu, orari,
 * indirizzo, informazioni pratiche. Non ha accesso a internet e non deve
 * dedurre nulla.
 *
 * Sugli allergeni non decide mai. Un modello che risponde "no, non contiene
 * glutine" può mandare qualcuno al pronto soccorso: riporta ciò che è
 * dichiarato e rimanda al personale, sempre.
 */

interface Body {
  slug: string;
  domanda: string;
}

const MAX_DOMANDA = 300;

interface VenueRow {
  id: string;
  name: string;
  slug: string;
  currency: string;
  address: string | null;
  address_zip: string | null;
  address_city: string | null;
  public_phone: string | null;
  opening_hours: string | null;
  practical_info: string | null;
  cover_charge_cents: number;
  service_percent: string;
  assistant_enabled: boolean;
  openrouter_api_key: string | null;
  openrouter_model: string | null;
  languages: string[];
  announcement_title: string | null;
  announcement_body: string | null;
  announcement_enabled: boolean;
}

export async function POST(request: Request) {
  // Ogni domanda costa una chiamata al modello, pagata dal locale: il
  // limite protegge la sua bolletta prima ancora del nostro servizio.
  const { allowed } = await checkRateLimit(clientKey(request, "assistente"), 15, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Hai fatto molte domande. Riprova più tardi o chiama il locale." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const domanda = body?.domanda?.trim().slice(0, MAX_DOMANDA);
  if (!body?.slug || !domanda) {
    return NextResponse.json({ error: "Scrivi una domanda" }, { status: 400 });
  }

  const sql = db();
  const [venue] = await sql<VenueRow[]>`
    select id, name, slug, currency, address, address_zip, address_city,
           public_phone, opening_hours, practical_info, cover_charge_cents,
           service_percent, assistant_enabled, openrouter_api_key,
           openrouter_model, languages, announcement_title, announcement_body,
           announcement_enabled
      from venues where slug = ${body.slug}`;

  if (!venue) return NextResponse.json({ error: "Locale non trovato" }, { status: 404 });

  if (!venue.assistant_enabled || !venue.openrouter_api_key) {
    return NextResponse.json({ error: "Assistente non attivo" }, { status: 404 });
  }

  let chiave: string;
  try {
    chiave = decryptSecret(venue.openrouter_api_key);
  } catch {
    console.error(`[assistente] chiave illeggibile per ${venue.slug}`);
    return NextResponse.json({ error: "Assistente non disponibile" }, { status: 503 });
  }

  const piatti = await sql<
    {
      name: string;
      description: string | null;
      price_cents: number;
      allergens: string[] | null;
      dietary_tags: string[] | null;
      conservation: string;
      categoria: string | null;
    }[]
  >`
    select mi.name, mi.description, mi.price_cents, mi.allergens, mi.dietary_tags,
           mi.conservation, mc.name as categoria
      from menu_items mi
      left join menu_categories mc on mc.id = mi.category_id
     where mi.venue_id = ${venue.id} and mi.available = true
     order by mc.sort_order, mi.sort_order
     limit 200`;

  const indirizzo = [venue.address, venue.address_zip, venue.address_city]
    .filter(Boolean)
    .join(" ");

  // Tutto ciò che il modello può sapere, scritto per esteso. Fuori da qui
  // non deve inventare niente.
  const contesto = [
    `LOCALE: ${venue.name}`,
    indirizzo ? `INDIRIZZO: ${indirizzo}` : null,
    venue.public_phone ? `TELEFONO: ${venue.public_phone}` : null,
    venue.opening_hours ? `ORARI: ${venue.opening_hours}` : "ORARI: non indicati",
    venue.practical_info ? `INFORMAZIONI: ${venue.practical_info}` : null,
    venue.cover_charge_cents > 0
      ? `COPERTO: ${formatPriceCents(venue.cover_charge_cents, venue.currency)} a persona`
      : null,
    Number(venue.service_percent) > 0
      ? `SERVIZIO: ${Number(venue.service_percent)}% sull'ordinato`
      : null,
    venue.announcement_enabled && venue.announcement_title
      ? `AVVISO: ${venue.announcement_title}. ${venue.announcement_body ?? ""}`
      : null,
    "",
    "MENU:",
    ...piatti.map((p) =>
      [
        `- ${p.categoria ? `[${p.categoria}] ` : ""}${p.name}`,
        formatPriceCents(p.price_cents, venue.currency),
        p.description ?? null,
        p.dietary_tags?.length ? `(${p.dietary_tags.join(", ")})` : null,
        p.allergens?.length ? `allergeni dichiarati: ${p.allergens.join(", ")}` : "allergeni non dichiarati",
        p.conservation !== "fresco" ? p.conservation : null,
      ]
        .filter(Boolean)
        .join(" · ")
    ),
  ]
    .filter((r) => r !== null)
    .join("\n");

  const istruzioni = `Sei l'assistente del locale ${venue.name}. Rispondi ai
clienti in modo breve e diretto, massimo tre frasi, nella lingua della
domanda.

Usi SOLO le informazioni qui sotto. Non hai accesso a internet e non sai
nulla di questo locale oltre a questo testo.

Se l'informazione non c'è, dillo e rimanda al locale${
    venue.public_phone ? ` al numero ${venue.public_phone}` : ""
  }. Non tirare a indovinare orari, prezzi o disponibilità.

SUGLI ALLERGENI E LE INTOLLERANZE, REGOLA ASSOLUTA: riporta solo ciò che è
dichiarato nel menu e aggiungi sempre di confermare con il personale prima
di ordinare. Non dire mai che un piatto è sicuro, adatto o privo di un
allergene: una risposta sbagliata può mandare qualcuno in ospedale.

Se il cliente vuole prenotare un tavolo, spiegagli che la prenotazione si
effettua dalla pagina principale del locale, non dal menu.

--- INFORMAZIONI DEL LOCALE ---
${contesto}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${chiave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: venue.openrouter_model || MODELLO_PREDEFINITO,
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          { role: "system", content: istruzioni },
          { role: "user", content: domanda },
        ],
      }),
      // Chi è al tavolo o davanti al menu non aspetta: oltre venti secondi
      // conviene mandarlo al telefono del locale.
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      console.error(`[assistente] OpenRouter ${res.status} per ${venue.slug}`);
      return NextResponse.json(
        {
          error: venue.public_phone
            ? `Non riesco a rispondere adesso. Chiama il ${venue.public_phone}.`
            : "Non riesco a rispondere adesso.",
        },
        { status: 503 }
      );
    }

    const dati = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const risposta = dati.choices?.[0]?.message?.content?.trim();

    if (!risposta) {
      return NextResponse.json({ error: "Non ho una risposta" }, { status: 503 });
    }

    return NextResponse.json({
      risposta,
    });
  } catch (e) {
    const scaduto = e instanceof Error && e.name === "TimeoutError";
    return NextResponse.json(
      {
        error: scaduto
          ? "Ci sto mettendo troppo."
          : "Non riesco a rispondere adesso.",
      },
      { status: 503 }
    );
  }
}
