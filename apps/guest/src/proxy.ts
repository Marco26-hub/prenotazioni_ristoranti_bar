import { NextResponse, type NextRequest } from "next/server";

/**
 * Porta il `?lang=` fino al layout.
 *
 * Solo il layout scrive `<html lang>`, e un layout non può leggere i
 * parametri della richiesta: `?lang=en` cambiava tutta la pagina e lasciava
 * l'attributo in cima a "it". Non è cosmetica — è quello che dice a un
 * lettore di schermo come pronunciare, e ai motori in che lingua è la pagina.
 *
 * Qui il parametro c'è, quindi lo si mette in un header della richiesta e il
 * layout lo legge come legge tutto il resto. È l'unico punto della catena che
 * vede insieme l'URL e la richiesta.
 *
 * Non tocca il resto della risoluzione: cookie e lingua del telefono
 * continuano a decidere quando `?lang=` non c'è.
 */
export const HEADER_LINGUA = "x-lingua-richiesta";

export default function proxy(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang");
  if (!lang) return NextResponse.next();

  const headers = new Headers(req.headers);
  headers.set(HEADER_LINGUA, lang.slice(0, 8));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  /*
   * Solo le pagine. Le rotte API leggono la lingua dalla richiesta per conto
   * loro, e le risorse statiche non hanno un `<html>` da correggere: farle
   * passare di qui sarebbe lavoro a ogni immagine.
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
