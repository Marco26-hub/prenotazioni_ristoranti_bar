import "server-only";

/**
 * Client per l'API Tilby (Zucchetti), il gestionale di cassa cloud più
 * diffuso in Italia. Serve a importare il menu che il locale ha già in
 * cassa — con prezzi e aliquote IVA corrette — invece di farglielo
 * ridigitare, e in prospettiva a rimandare le vendite in cassa.
 *
 * Autenticazione: bearer token, uno per negozio. Il token si ottiene solo
 * aderendo al Developer Program di Tilby, che prevede approvazione della
 * domanda e costi di attivazione e mantenimento.
 *
 * Fonte: https://developer.tilby.com/docs
 */

const BASE_URL = "https://api.tilby.com/v2";

export interface TilbyCategory {
  id: number;
  name: string;
  index: number | null;
  deleted_at: string | null;
}

export interface TilbyItem {
  id: number;
  name: string;
  description: string | null;
  price1: number;
  category_id: number | null;
  vat_perc: number | null;
  on_sale: boolean;
  deleted_at: string | null;
}

export interface TilbyShop {
  id: number;
  name: string;
}

async function tilbyGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    // Il menu in cassa cambia di rado, ma non deve mai essere servito da
    // cache: un prezzo vecchio importato è un prezzo sbagliato al tavolo.
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Token Tilby non valido o senza permessi");
  }
  if (!res.ok) {
    throw new Error(`Tilby ${path} ha risposto ${res.status}`);
  }
  return res.json();
}

/**
 * Verifica il token e dice a quale negozio appartiene. Da chiamare prima
 * di salvarlo, così il gestore scopre subito un token sbagliato invece che
 * al primo import fallito.
 */
export async function getTilbyShop(token: string): Promise<TilbyShop> {
  const session = await tilbyGet<{ shop?: TilbyShop; id?: number; name?: string }>(
    "/sessions/me",
    token
  );
  if (session.shop) return session.shop;
  return { id: session.id ?? 0, name: session.name ?? "negozio Tilby" };
}

export async function getTilbyCategories(token: string): Promise<TilbyCategory[]> {
  const all = await tilbyGet<TilbyCategory[]>("/categories", token);
  return all.filter((c) => !c.deleted_at);
}

export async function getTilbyItems(token: string): Promise<TilbyItem[]> {
  const all = await tilbyGet<TilbyItem[]>("/items", token);
  // `deleted_at` valorizzato = articolo eliminato in cassa; `on_sale` false
  // = non in vendita. Nessuno dei due va portato nel menu del cliente.
  return all.filter((i) => !i.deleted_at && i.on_sale !== false);
}
