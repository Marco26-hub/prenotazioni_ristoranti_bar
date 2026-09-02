import { createHash } from "node:crypto";
import { db } from "@repo/shared/db";

/**
 * Foto di un piatto.
 *
 * Le immagini sono salvate come data URL in colonna. Metterle direttamente
 * nell'HTML sembra comodo ma le fa viaggiare **due volte** — una nel markup
 * e una nel payload dei componenti server — e in base64, che aggiunge un
 * terzo. Un menu da quindici piatti diventava così una pagina da 2,7 MB
 * aperta al tavolo su rete mobile.
 *
 * Servite da qui pesano il giusto, si comprimono, e soprattutto il browser
 * se le tiene: alla seconda apertura del menu non si scarica nulla.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;

  const sql = db();
  const [riga] = await sql<{ image_url: string | null }[]>`
    select image_url from menu_items where id = ${itemId}`;

  // Nessuna verifica di locale: una foto di piatto è già pubblica sul menu,
  // e richiedere una sessione impedirebbe al browser di metterla in cache.
  if (!riga?.image_url?.startsWith("data:")) {
    return new Response(null, { status: 404 });
  }

  const virgola = riga.image_url.indexOf(",");
  const intestazione = riga.image_url.slice(5, virgola);
  const tipo = intestazione.split(";")[0] || "image/jpeg";
  const dati = Buffer.from(riga.image_url.slice(virgola + 1), "base64");

  // L'ETag viene dal contenuto: cambiando la foto cambia da sé, senza
  // dover invalidare niente a mano.
  const etag = `"${createHash("sha1").update(dati).digest("hex").slice(0, 16)}"`;

  return new Response(new Uint8Array(dati), {
    headers: {
      "Content-Type": tipo,
      "Content-Length": String(dati.length),
      ETag: etag,
      // Poco in cache diretta ma riusabile a lungo mentre si rinfresca:
      // un ristoratore che cambia foto la vede aggiornata in fretta, e chi
      // è al tavolo non aspetta comunque.
      "Cache-Control": "public, max-age=60, stale-while-revalidate=604800",
    },
  });
}
