"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";

export async function saveInvoiceSettings(formData: FormData) {
  const { venue } = await requireVenue();

  const vatNumber = String(formData.get("vatNumber") ?? "").trim();
  const fiscalCode = String(formData.get("fiscalCode") ?? "").trim();
  const regimeFiscale = String(formData.get("regimeFiscale") ?? "RF01").trim();
  const address = String(formData.get("address") ?? "").trim();
  const addressZip = String(formData.get("addressZip") ?? "").trim();
  const addressCity = String(formData.get("addressCity") ?? "").trim();
  const addressProvince = String(formData.get("addressProvince") ?? "").trim().toUpperCase();
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  const sql = db();

  // La chiave API va scritta solo se l'utente ne ha incollata una nuova —
  // altrimenti il campo password vuoto in submit la cancellerebbe.
  if (apiKey) {
    await sql`
      update venues set
        vat_number = ${vatNumber}, fiscal_code = ${fiscalCode}, regime_fiscale = ${regimeFiscale},
        address = ${address}, address_zip = ${addressZip}, address_city = ${addressCity},
        address_province = ${addressProvince}, invoice_provider_api_key = ${apiKey}
      where id = ${venue.venueId}`;
  } else {
    await sql`
      update venues set
        vat_number = ${vatNumber}, fiscal_code = ${fiscalCode}, regime_fiscale = ${regimeFiscale},
        address = ${address}, address_zip = ${addressZip}, address_city = ${addressCity},
        address_province = ${addressProvince}
      where id = ${venue.venueId}`;
  }

  revalidatePath("/dashboard/settings");
}
