import "server-only";
import crypto from "node:crypto";

/**
 * Firma HTTP per l'API Satispay (Signing HTTP Messages draft). Implementata
 * a mano con `node:crypto` invece di una libreria di terzi — Satispay non
 * pubblica un SDK Node ufficiale, e le librerie community trovate hanno
 * pochissima adozione: per la firma di richieste di pagamento reali è più
 * affidabile seguire la spec ufficiale alla lettera che fidarsi di un
 * pacchetto npm poco verificato.
 *
 * Fonte: https://developers.satispay.com/reference/how-to
 */

export interface SignedRequestHeaders extends Record<string, string> {
  "Content-Type": string;
  Host: string;
  Date: string;
  Digest: string;
  Authorization: string;
}

function rfc2822Date(): string {
  // Satispay vuole "EEE, dd MMM yyyy HH:mm:ss Z" — Date#toUTCString di JS
  // produce esattamente questo formato (GMT invece di +0000 è comunque
  // conforme RFC 2822, testato contro l'endpoint /test_authentication).
  return new Date().toUTCString();
}

function digestOf(body: string): string {
  const hash = crypto.createHash("sha256").update(body, "utf8").digest();
  return `SHA-256=${hash.toString("base64")}`;
}

export function signRequest(params: {
  method: "GET" | "POST" | "PUT";
  path: string; // es. "/g_business/v1/payments"
  host: string; // es. "authservices.satispay.com"
  body: string; // "" per GET senza body
  keyId: string;
  privateKeyPem: string;
}): SignedRequestHeaders {
  const { method, path, host, body, keyId, privateKeyPem } = params;

  const digest = digestOf(body);
  const date = rfc2822Date();

  const message = [
    `(request-target): ${method.toLowerCase()} ${path}`,
    `host: ${host}`,
    `date: ${date}`,
    `digest: ${digest}`,
  ].join("\n");

  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(message, "utf8"), {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    })
    .toString("base64");

  const authorization =
    `Signature keyId="${keyId}", algorithm="rsa-sha256", ` +
    `headers="(request-target) host date digest", signature="${signature}"`;

  return {
    "Content-Type": "application/json",
    Host: host,
    Date: date,
    Digest: digest,
    Authorization: authorization,
  };
}
