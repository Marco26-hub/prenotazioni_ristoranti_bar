import "server-only";
import crypto from "node:crypto";

/**
 * Cifratura dei segreti dei locali salvati nel DB (chiave privata Satispay,
 * API key del provider fatture). Chi legge il database non deve poter
 * firmare pagamenti o emettere fatture per conto dei locali.
 *
 * AES-256-GCM: autenticato, quindi una manomissione del ciphertext viene
 * rilevata invece di produrre silenziosamente dati sbagliati.
 * Formato: v1:<iv base64>:<authTag base64>:<ciphertext base64>
 */

const PREFIX = "v1";

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY mancante");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY deve essere 32 byte in base64");
  }
  return buf;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Accetta anche valori non cifrati: le prime chiavi sono state salvate in
 * chiaro, e devono continuare a funzionare finché non vengono riscritte.
 */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(`${PREFIX}:`)) return stored;

  const [, ivB64, tagB64, dataB64] = stored.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
