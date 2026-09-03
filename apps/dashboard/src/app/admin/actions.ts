"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "@repo/shared/db";
import { requireSuperAdmin } from "@/lib/authz";
import { type Modulo } from "@repo/shared";

const VALIDI: Modulo[] = ["ordini", "prenotazioni"];

/**
 * Attiva o disattiva a mano i moduli di un locale.
 *
 * Serve per il caso che il pagamento con carta non copre: il locale che paga
 * con bonifico, la prova estesa concordata al telefono, il cliente storico a
 * condizioni sue. Senza, l'unico modo per far lavorare quel locale sarebbe
 * modificare il database a mano.
 *
 * Ogni intervento lascia traccia: quando un locale contesta l'accesso a un
 * modulo o la fattura, serve sapere chi gliel'ha dato e quando.
 */
export async function impostaModuli(
  venueId: string,
  moduli: string[],
  nota: string
): Promise<{ ok?: string; error?: string }> {
  const admin = await requireSuperAdmin();
  const puliti = [...new Set((moduli ?? []).filter((m) => VALIDI.includes(m as Modulo)))];

  const sql = db();
  const [v] = await sql<{ name: string }[]>`
    update venues set modules = ${puliti} where id = ${venueId} returning name`;
  if (!v) return { error: "Locale non trovato" };

  await sql`
    insert into platform_events (venue_id, admin_id, admin_label, azione, dettaglio)
    values (${venueId}, ${admin.userId}, ${admin.email}, 'moduli',
            ${`${puliti.join(", ") || "nessuno"}${nota ? " — " + nota.slice(0, 200) : ""}`})`;

  revalidatePath("/admin");
  return { ok: `${v.name}: ${puliti.join(", ") || "nessun modulo"}.` };
}

/**
 * Proroga o chiude l'abbonamento a mano.
 *
 * Le date arrivano dal webbook di Stripe per chi paga con carta; per tutti
 * gli altri qualcuno le deve poter mettere.
 */
export async function impostaAbbonamento(
  venueId: string,
  stato: string,
  /**
   * Nuova durata a partire da adesso, oppure `null` per non toccare la
   * scadenza che c'è già.
   *
   * Prima era un numero e basta, con 30 come valore di partenza in
   * interfaccia: chi apriva la riga solo per cambiare lo stato riscriveva
   * senza saperlo la scadenza a trenta giorni da oggi. Un locale che aveva
   * pagato l'anno per bonifico perdeva dieci mesi, e la risposta era una
   * conferma verde. Al contrario, una prova a tre giorni dalla fine veniva
   * prorogata di un mese.
   */
  giorni: number | null,
  nota: string
): Promise<{ ok?: string; error?: string }> {
  const admin = await requireSuperAdmin();

  const statiValidi = ["trialing", "active", "past_due", "canceled", "none"];
  if (!statiValidi.includes(stato)) return { error: "Stato non valido" };
  if (giorni !== null && (!Number.isFinite(giorni) || giorni < 0 || giorni > 1095)) {
    return { error: "Giorni fra 0 e 1095, oppure vuoto per non cambiare la scadenza" };
  }

  const sql = db();
  const [v] = await sql<{ name: string }[]>`
    update venues
       set subscription_status = ${stato},
           subscription_period_end = ${
             giorni === null
               ? sql`subscription_period_end`
               : giorni > 0
                 ? sql`now() + make_interval(days => ${giorni})`
                 : null
           }
     where id = ${venueId}
    returning name`;
  if (!v) return { error: "Locale non trovato" };

  await sql`
    insert into platform_events (venue_id, admin_id, admin_label, azione, dettaglio)
    values (${venueId}, ${admin.userId}, ${admin.email}, 'abbonamento',
            ${`${stato}${
              giorni === null
                ? " (scadenza invariata)"
                : giorni > 0
                  ? ` per ${giorni} giorni`
                  : " senza scadenza"
            }${nota ? " — " + nota.slice(0, 200) : ""}`})`;

  revalidatePath("/admin");
  return {
    ok: `${v.name}: ${stato}${
      giorni === null
        ? ", scadenza invariata"
        : giorni > 0
          ? `, ancora ${giorni} giorni`
          : ", senza scadenza"
    }.`,
  };
}

/**
 * Cambio della propria password.
 *
 * Obbligatorio al primo accesso: la password iniziale di un account come
 * questo viene per forza comunicata in chiaro da qualche parte, e da quel
 * momento non è più un segreto.
 */
export async function cambiaPasswordAdmin(
  formData: FormData
): Promise<{ ok?: string; error?: string }> {
  const admin = await requireSuperAdmin();

  const nuova = String(formData.get("nuova") ?? "");
  const conferma = String(formData.get("conferma") ?? "");

  if (nuova.length < 12) {
    return { error: "Almeno 12 caratteri: questo accesso vede tutti i locali." };
  }
  if (nuova !== conferma) return { error: "Le due password non coincidono" };
  if (/^[a-z]+$/i.test(nuova) || /^\d+$/.test(nuova)) {
    return { error: "Mescola lettere, numeri e almeno un simbolo." };
  }

  const sql = db();
  await sql`
    update users
       set password_hash = ${bcrypt.hashSync(nuova, 10)},
           must_change_password = false
     where id = ${admin.userId}`;

  await sql`
    insert into platform_events (admin_id, admin_label, azione)
    values (${admin.userId}, ${admin.email}, 'password cambiata')`;

  revalidatePath("/admin");
  return { ok: "Password aggiornata." };
}

/** Referente e stato del rapporto: quello che il database non sa da solo. */
export async function salvaScheda(
  venueId: string,
  campi: {
    referente_nome: string;
    referente_telefono: string;
    referente_email: string;
    provenienza: string;
    ricontattare_il: string;
    motivo_abbandono: string;
  }
): Promise<{ ok?: string; error?: string }> {
  await requireSuperAdmin();

  const testo = (v: string, max = 120) => {
    const t = String(v ?? "").trim();
    return t ? t.slice(0, max) : null;
  };
  const data = String(campi.ricontattare_il ?? "").trim();
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return { error: "Data non valida" };
  }

  const sql = db();
  const [v] = await sql<{ name: string }[]>`
    update venues set
      referente_nome = ${testo(campi.referente_nome)},
      referente_telefono = ${testo(campi.referente_telefono, 40)},
      referente_email = ${testo(campi.referente_email)},
      provenienza = ${testo(campi.provenienza, 60)},
      ricontattare_il = ${data || null},
      motivo_abbandono = ${testo(campi.motivo_abbandono, 300)}
    where id = ${venueId}
    returning name`;

  if (!v) return { error: "Locale non trovato" };
  revalidatePath("/admin");
  return { ok: "Scheda salvata." };
}

/**
 * Una nota sul cliente.
 *
 * Non modificabile e non cancellabile: una cronologia che si puo' riscrivere
 * non e' una cronologia, e serve proprio quando qualcuno contesta cosa era
 * stato detto.
 */
export async function aggiungiNota(
  venueId: string,
  testo: string
): Promise<{ ok?: string; error?: string }> {
  const admin = await requireSuperAdmin();
  const t = String(testo ?? "").trim();
  if (!t) return { error: "Scrivi qualcosa" };

  const sql = db();
  await sql`
    insert into venue_notes (venue_id, autore_id, autore_label, testo)
    values (${venueId}, ${admin.userId}, ${admin.email}, ${t.slice(0, 2000)})`;

  revalidatePath("/admin");
  return { ok: "Nota aggiunta." };
}

/** Risponde a una richiesta di assistenza e ne cambia lo stato. */
export async function rispondiTicket(
  ticketId: string,
  risposta: string,
  stato: "aperto" | "in_corso" | "risolto"
): Promise<{ ok?: string; error?: string }> {
  const admin = await requireSuperAdmin();
  if (!["aperto", "in_corso", "risolto"].includes(stato)) {
    return { error: "Stato non valido" };
  }

  const sql = db();
  const [t] = await sql<{ id: string }[]>`
    update support_tickets
       set risposta = ${String(risposta ?? "").trim().slice(0, 4000) || null},
           stato = ${stato},
           gestito_da = ${admin.userId},
           gestito_da_label = ${admin.email},
           risolto_at = ${stato === "risolto" ? sql`now()` : null}
     where id = ${ticketId}
    returning id`;

  if (!t) return { error: "Richiesta non trovata" };
  revalidatePath("/admin");
  return { ok: stato === "risolto" ? "Segnata risolta." : "Risposta salvata." };
}

/**
 * Crea il titolare di un locale dal pannello.
 *
 * Vendere un servizio e poi chiedere al cliente di registrarsi da solo
 * significa perderne una parte al primo modulo. Qui l'account lo si crea
 * mentre si è al telefono con lui, e gli si dà la password a voce.
 *
 * La password iniziale la generiamo noi e la si vede una volta sola: una
 * password scelta da chi la deve comunicare finisce per essere "1234567" su
 * tutti i clienti. Vale per un accesso, poi il titolare deve cambiarla.
 */
export async function creaTitolare(
  venueId: string,
  nome: string,
  email: string
): Promise<{ ok?: string; error?: string; password?: string }> {
  const admin = await requireSuperAdmin();

  const mail = String(email ?? "").trim().toLowerCase();
  const chi = String(nome ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return { error: "Email non valida" };
  if (!chi) return { error: "Serve il nome del referente" };

  const sql = db();
  const [locale] = await sql<{ name: string }[]>`
    select name from venues where id = ${venueId}`;
  if (!locale) return { error: "Locale non trovato" };

  const [esistente] = await sql<{ id: string }[]>`
    select id from users where email = ${mail}`;
  if (esistente) {
    // Un account c'è già: lo si collega, non si sovrascrive la sua password.
    const [gia] = await sql<{ id: string }[]>`
      select id from venue_staff
       where venue_id = ${venueId} and user_id = ${esistente.id}`;
    if (gia) return { error: "Questa persona è già nel locale" };

    await sql`
      insert into venue_staff (venue_id, user_id, role)
      values (${venueId}, ${esistente.id}, 'owner')`;
    await sql`
      insert into platform_events (venue_id, admin_id, admin_label, azione, dettaglio)
      values (${venueId}, ${admin.userId}, ${admin.email}, 'titolare collegato', ${mail})`;
    revalidatePath("/admin");
    return { ok: `${mail} è ora titolare di ${locale.name}. Usa la password che ha già.` };
  }

  // Password iniziale generata: leggibile a voce, ma non indovinabile.
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  const password =
    Array.from(bytes.slice(0, 4), (b) => alfabeto[b % alfabeto.length]).join("") +
    "-" +
    Array.from(bytes.slice(4, 8), (b) => alfabeto[b % alfabeto.length]).join("") +
    "-" +
    Array.from(bytes.slice(8), (b) => alfabeto[b % alfabeto.length]).join("");

  const [u] = await sql<{ id: string }[]>`
    insert into users (email, password_hash, name, must_change_password)
    values (${mail}, ${bcrypt.hashSync(password, 10)}, ${chi.slice(0, 80)}, true)
    returning id`;

  await sql`
    insert into venue_staff (venue_id, user_id, role)
    values (${venueId}, ${u.id}, 'owner')`;

  await sql`
    insert into platform_events (venue_id, admin_id, admin_label, azione, dettaglio)
    values (${venueId}, ${admin.userId}, ${admin.email}, 'titolare creato', ${mail})`;

  revalidatePath("/admin");
  return {
    ok: `Titolare creato per ${locale.name}.`,
    // Mostrata una volta sola: non la salviamo in chiaro da nessuna parte.
    password,
  };
}
