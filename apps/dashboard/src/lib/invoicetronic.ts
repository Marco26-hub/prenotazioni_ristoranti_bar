import "server-only";
import { Configuration, SendApi } from "@invoicetronic/ts-sdk";

export function invoicetronicClient(apiKey: string): SendApi {
  return new SendApi(new Configuration({
    basePath: "https://api.invoicetronic.com/v1",
    username: apiKey,
    password: "",
  }));
}
