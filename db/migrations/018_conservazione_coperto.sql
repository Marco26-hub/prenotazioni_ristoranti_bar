-- Stato di conservazione e coperto: due cose che su una carta italiana non
-- sono facoltative.
--
-- Il congelato va dichiarato al cliente (Reg. UE 1169/2011 e D.Lgs.
-- 109/1992). Il pesce servito crudo va abbattuto per l'Anisakis e
-- l'abbattimento va dichiarato (Reg. CE 853/2004). Un menu digitale che non
-- lo riporta mette il locale fuori norma esattamente come per gli allergeni.

alter table menu_items
  add column if not exists conservation text not null default 'fresco'
    check (conservation in ('fresco', 'congelato', 'surgelato', 'abbattuto'));

-- L'origine della carne bovina è obbligatoria (Reg. CE 1760/2000). Testo
-- libero perché la dicitura richiesta cambia con la filiera.
alter table menu_items
  add column if not exists origin_note text;

alter table venues
  -- Coperto per persona, in centesimi. Zero significa che non si applica:
  -- molti locali non lo mettono, e un coperto a zero stampato in conto
  -- sembrerebbe un errore.
  add column if not exists cover_charge_cents int not null default 0,
  -- Percentuale di servizio, dove si usa. Separata dal coperto perché si
  -- calcola sull'ordinato e non a testa.
  add column if not exists service_percent numeric(4,1) not null default 0,
  add column if not exists cover_charge_label text;

alter table venues drop constraint if exists servizio_plausibile;
alter table venues add constraint servizio_plausibile
  check (service_percent >= 0 and service_percent <= 30);

alter table venues drop constraint if exists coperto_plausibile;
alter table venues add constraint coperto_plausibile
  check (cover_charge_cents >= 0 and cover_charge_cents <= 5000);
