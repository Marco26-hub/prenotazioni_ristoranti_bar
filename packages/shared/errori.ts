/**
 * Il messaggio di un errore, senza quello che ci sta attaccato.
 *
 * Passare l'oggetto errore a console.error sembra innocuo e non lo è: gli
 * errori dei client HTTP portano con sé la configurazione della richiesta, e
 * lì dentro c'è l'autenticazione. Un AxiosError, per esempio, espone
 * `config.auth`, l'header `Authorization` e perfino l'URL con le credenziali
 * incorporate: `console.error(msg, err)` li stampa tutti e tre in chiaro.
 *
 * Sui log di una piattaforma quella è la chiave del locale — Invoicetronic,
 * Tilby, Stripe — leggibile da chiunque abbia accesso ai log, oggi e in
 * qualunque backup futuro.
 *
 * Qui si tiene solo il messaggio, e lo si ripulisce comunque: alcune
 * librerie il segreto lo mettono proprio nel messaggio.
 */

/** Prefissi di chiave riconoscibili, di questa piattaforma e dei fornitori. */
const SEGRETI = [
  /\bsk_[A-Za-z0-9_]{6,}/g, // Stripe segreta
  /\brk_[A-Za-z0-9_]{6,}/g, // Stripe ristretta
  /\bre_[A-Za-z0-9_]{6,}/g, // Resend
  /\bik_[A-Za-z0-9_]{6,}/g, // Invoicetronic
  /\bsk-or-[A-Za-z0-9-]{6,}/g, // OpenRouter
  /\bgh[pousr]_[A-Za-z0-9]{6,}/g, // GitHub
  /\bwhsec_[A-Za-z0-9_]{6,}/g, // firme webhook
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9+/=._-]{8,}/gi,
  // Credenziali dentro un URL: https://chiave:@host
  /(https?:\/\/)[^/\s:@]+:[^/\s@]*@/gi,
];

export function messaggioErrore(err: unknown): string {
  let testo: string;

  if (err instanceof Error) testo = `${err.name}: ${err.message}`;
  else if (typeof err === "string") testo = err;
  else testo = "errore non identificato";

  for (const r of SEGRETI) {
    testo = testo.replace(r, (m) =>
      m.startsWith("http") ? m.replace(/\/\/[^@]*@/, "//***@") : "***"
    );
  }

  // Un messaggio lunghissimo di solito e un dump travestito.
  return testo.length > 300 ? testo.slice(0, 300) + "…" : testo;
}
