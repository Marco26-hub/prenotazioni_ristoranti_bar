import "server-only";
import type { Sql } from "postgres";

/**
 * Logica di disponibilità delle prenotazioni.
 *
 * Un tavolo non si libera all'istante: chi prenota alle 20:00 occupa posti
 * anche alle 20:30. Contare solo le prenotazioni con la stessa ora esatta
 * lascerebbe accettare venti coperti alle 20:00, venti alle 20:15 e venti
 * alle 20:30 in un locale da trenta.
 */

/** Quanto tempo si considera occupato un tavolo dopo l'orario prenotato. */
export const DURATA_TAVOLO_MIN = 105;

export interface Disponibilita {
  /** Coperti già impegnati nella fascia che tocca l'orario richiesto. */
  occupati: number;
  capienza: number | null;
  /** null quando il locale non ha dichiarato una capienza: non si può decidere. */
  disponibili: number | null;
  bastano: boolean;
}

interface RigaOccupati {
  occupati: string | null;
}

/**
 * Coperti impegnati in una fascia che si sovrappone all'orario richiesto.
 *
 * Due prenotazioni si sovrappongono se l'una inizia prima che l'altra
 * finisca, in entrambi i versi: è il confronto che serve, non l'uguaglianza
 * fra orari.
 */
export async function disponibilita(
  sql: Sql,
  venueId: string,
  quando: Date,
  copertiRichiesti: number,
  escludiId?: string
): Promise<Disponibilita> {
  const [venue] = await sql<{ reservation_capacity: number | null }[]>`
    select reservation_capacity from venues where id = ${venueId}`;

  const capienza = venue?.reservation_capacity ?? null;

  const [riga] = await sql<RigaOccupati[]>`
    select sum(party_size) as occupati
      from reservations
     where venue_id = ${venueId}
       and status in ('pending', 'confirmed', 'seated')
       and ${escludiId ? sql`id <> ${escludiId}` : sql`true`}
       and reserved_at < ${quando}::timestamptz + (${DURATA_TAVOLO_MIN} || ' minutes')::interval
       and reserved_at + (${DURATA_TAVOLO_MIN} || ' minutes')::interval > ${quando}`;

  const occupati = Number(riga?.occupati ?? 0);

  if (capienza === null) {
    // Senza capienza dichiarata non si può dire di no con cognizione: si
    // riporta l'occupazione e si lascia decidere una persona.
    return { occupati, capienza: null, disponibili: null, bastano: true };
  }

  const disponibili = capienza - occupati;
  return { occupati, capienza, disponibili, bastano: disponibili >= copertiRichiesti };
}

/**
 * Orari vicini in cui i coperti richiesti entrerebbero.
 *
 * Proposti a passi di mezz'ora attorno all'orario chiesto, alternando prima
 * e dopo: chi voleva le 20:00 accetta più volentieri le 19:30 o le 20:30 che
 * un generico "richiami".
 */
export async function slotAlternativi(
  sql: Sql,
  venueId: string,
  quando: Date,
  coperti: number,
  quanti = 3
): Promise<Date[]> {
  const trovati: Date[] = [];
  const passi = [-30, 30, -60, 60, -90, 90, -120, 120];

  for (const minuti of passi) {
    if (trovati.length >= quanti) break;

    const candidato = new Date(quando.getTime() + minuti * 60_000);
    // Nessuno vuole sentirsi proporre un orario già passato.
    if (candidato.getTime() < Date.now()) continue;

    const d = await disponibilita(sql, venueId, candidato, coperti);
    if (d.bastano && d.disponibili !== null) trovati.push(candidato);
  }

  return trovati.sort((a, b) => a.getTime() - b.getTime());
}

export function formattaOrario(d: Date, timezone = "Europe/Rome"): string {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(d);
}
