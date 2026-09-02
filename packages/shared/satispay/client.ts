import "server-only";
import { signRequest } from "./sign";

const HOST =
  process.env.SATISPAY_ENV === "staging"
    ? "staging.authservices.satispay.com"
    : "authservices.satispay.com";

interface CreatePaymentInput {
  keyId: string;
  privateKeyPem: string;
  amountCents: number;
  externalCode: string;
  callbackUrl: string;
  redirectUrl: string;
}

interface SatispayPaymentResponse {
  id: string;
  status: "PENDING" | "AUTHORIZED" | "ACCEPTED";
  redirect_url: string;
}

export async function createSatispayPayment(
  input: CreatePaymentInput
): Promise<SatispayPaymentResponse> {
  const path = "/g_business/v1/payments";
  const body = JSON.stringify({
    flow: "MATCH_CODE",
    amount_unit: input.amountCents,
    currency: "EUR",
    external_code: input.externalCode,
    callback_url: input.callbackUrl,
    redirect_url: input.redirectUrl,
  });

  const headers = signRequest({
    method: "POST",
    path,
    host: HOST,
    body,
    keyId: input.keyId,
    privateKeyPem: input.privateKeyPem,
  });

  const res = await fetch(`https://${HOST}${path}`, { method: "POST", headers, body });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Satispay create payment failed (${res.status}): ${detail}`);
  }
  return res.json();
}

export async function getSatispayPayment(
  paymentId: string,
  keyId: string,
  privateKeyPem: string
): Promise<SatispayPaymentResponse> {
  const path = `/g_business/v1/payments/${paymentId}`;

  const headers = signRequest({
    method: "GET",
    path,
    host: HOST,
    body: "",
    keyId,
    privateKeyPem,
  });

  const res = await fetch(`https://${HOST}${path}`, { method: "GET", headers });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Satispay get payment failed (${res.status}): ${detail}`);
  }
  return res.json();
}

export async function obtainSatispayKeyId(
  publicKeyPem: string,
  activationToken: string
): Promise<string> {
  const res = await fetch(`https://${HOST}/g_business/v1/authentication_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_key: publicKeyPem, token: activationToken }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Satispay key activation failed (${res.status}): ${detail}`);
  }
  const data = await res.json();
  return data.key_id;
}
