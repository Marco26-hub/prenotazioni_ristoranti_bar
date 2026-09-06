"use client";

import { createContext, useContext } from "react";
import { LINGUA_UI_BASE, type LinguaUI } from "./index";

/**
 * La lingua attiva, disponibile a qualunque componente client.
 *
 * L'alternativa era passare `lingua` come prop lungo tutto l'albero. In un
 * carrello annidato cinque livelli sotto la pagina significa cinque
 * componenti che ricevono una prop che non usano — e uno di quei cinque,
 * prima o poi, si dimentica di passarla e mostra italiano in mezzo
 * all'inglese senza che nessuno se ne accorga.
 */
const Contesto = createContext<LinguaUI>(LINGUA_UI_BASE);

export function LinguaProvider({
  lingua,
  children,
}: {
  lingua: LinguaUI;
  children: React.ReactNode;
}) {
  return <Contesto.Provider value={lingua}>{children}</Contesto.Provider>;
}

export function useLingua(): LinguaUI {
  return useContext(Contesto);
}
