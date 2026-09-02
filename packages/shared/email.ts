import "server-only";

/**
 * Invio email tramite Resend.
 *
 * Scritto attorno alla loro API HTTP invece che con l'SDK: è una sola
 * chiamata POST, e una dipendenza in meno da tenere aggiornata.
 *
 * Senza chiave configurata non fallisce e non lancia: restituisce un
 * errore descrittivo che il chiamante registra accanto alla prenotazione.
 * Una prenotazione persa perché il provider email non era pronto sarebbe
 * il peggiore dei risultati.
 */

export interface EsitoEmail {
  inviata: boolean;
  errore?: string;
}

/**
 * Credenziali del locale, quando ha collegato il proprio dominio.
 *
 * Restano facoltative: senza, si usa il mittente della piattaforma. È il
 * caso normale, perché verificare un dominio su Resend richiede di toccare
 * i record DNS e quasi nessun ristoratore lo farà.
 */
export interface MittenteLocale {
  apiKey: string | null;
  from: string | null;
}

export interface Messaggio {
  a: string;
  oggetto: string;
  /** Testo semplice: le caselle dei ristoratori filtrano meno l'HTML sobrio,
   *  ma un messaggio di servizio leggibile in chiaro arriva sempre. */
  testo: string;
  /** Mittente: se assente si usa RESEND_FROM. */
  da?: string;
  rispondiA?: string;
  /** Credenziali proprie del locale, se le ha configurate. */
  mittenteLocale?: MittenteLocale;
  /** Allegati già codificati in Base64, come richiesto dall'API Resend. */
  allegati?: Array<{
    nomeFile: string;
    contenutoBase64: string;
    contentType?: string;
  }>;
}

export function emailConfigurata(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export async function inviaEmail(m: Messaggio): Promise<EsitoEmail> {
  // Le credenziali del locale hanno la precedenza, ma solo se complete:
  // una chiave senza mittente verificato farebbe rifiutare l'invio da
  // Resend, e il locale resterebbe senza email credendo di averle attivate.
  const proprie =
    m.mittenteLocale?.apiKey && m.mittenteLocale?.from ? m.mittenteLocale : null;

  const chiave = proprie?.apiKey ?? process.env.RESEND_API_KEY;
  const mittente = proprie?.from ?? m.da ?? process.env.RESEND_FROM;

  if (!chiave || !mittente) {
    return {
      inviata: false,
      errore: "Invio email non configurato (RESEND_API_KEY / RESEND_FROM)",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chiave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mittente,
        to: [m.a],
        subject: m.oggetto,
        text: m.testo,
        ...(m.rispondiA ? { reply_to: m.rispondiA } : {}),
        ...(m.allegati?.length
          ? {
              attachments: m.allegati.map((a) => ({
                filename: a.nomeFile,
                content: a.contenutoBase64,
                ...(a.contentType ? { content_type: a.contentType } : {}),
              })),
            }
          : {}),
      }),
      // Una casella lenta non deve tenere in attesa il cliente che sta
      // prenotando: oltre dieci secondi si registra l'errore e si prosegue.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      return { inviata: false, errore: `Resend ${res.status}: ${corpo.slice(0, 200)}` };
    }

    return { inviata: true };
  } catch (e) {
    return {
      inviata: false,
      errore: e instanceof Error ? e.message : "Errore di rete verso Resend",
    };
  }
}
