import "server-only";
import { Configuration, SendApi } from "@invoicetronic/ts-sdk";

/**
 * Basic Auth: API key del locale come username, password vuota (come da
 * documentazione Invoicetronic). L'ambiente (sandbox/live) è determinato
 * dal prefisso della chiave stessa (ik_test_ / ik_live_), non dall'URL.
 */
export function invoicetronicClient(apiKey: string): SendApi {
  const configuration = new Configuration({
    basePath: "https://api.invoicetronic.com/v1",
    username: apiKey,
    password: "",
  });
  return new SendApi(configuration);
}
