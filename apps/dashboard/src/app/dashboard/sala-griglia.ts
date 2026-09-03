/**
 * Griglia astratta su cui si dispone la sala.
 *
 * Sta fuori dal file "use server" perché lì possono vivere solo funzioni
 * async: costanti e tipi condivisi fra client e server vanno altrove.
 *
 * Coordinate e non pixel: la pianta si adatta alla larghezza dello schermo
 * senza che le posizioni salvate perdano significato.
 */
export const COLONNE = 16;
export const RIGHE = 12;

export interface Posizione {
  id: string;
  x: number;
  y: number;
}
