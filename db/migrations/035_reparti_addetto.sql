-- Su quali reparti un addetto può operare.
--
-- Il reparto esisteva già come filtro dello schermo: utile per non vedere
-- rumore, ma un filtro non è un permesso — chi lo toglieva poteva comunque
-- muovere le comande della cucina dallo schermo del bar. Sono due cose
-- diverse e vanno tenute separate: cosa vedo, e cosa posso toccare.
--
-- Elenco vuoto significa "tutti i reparti": è il caso della stragrande
-- maggioranza dei locali, dove chi c'è fa tutto, e non deve costare una
-- configurazione per partire.

alter table venue_staff
  add column if not exists reparti text[] not null default '{}';
