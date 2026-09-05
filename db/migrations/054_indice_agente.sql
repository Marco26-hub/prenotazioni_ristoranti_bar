-- L'agente si riconosce con una ricerca, non scorrendo tutti i locali.
--
-- localeDalToken caricava ogni locale con un agente configurato e li
-- confrontava uno per uno. Con mille locali che interrogano la coda ogni
-- cinque secondi sono dodicimila scansioni complete al minuto: funziona
-- benissimo con tre clienti e mette in ginocchio il database con mille.
--
-- L'impronta e' uno SHA-256: e' deterministica, quindi si cerca direttamente.
-- Unico perche' due locali non possono avere lo stesso segreto -- se
-- capitasse, l'agente di uno emetterebbe i documenti fiscali dell'altro.
create unique index if not exists uq_rt_agente_hash
  on venues (rt_agente_hash) where rt_agente_hash is not null;
