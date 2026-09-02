-- SOLO PER SVILUPPO LOCALE. Non applicare a un database di produzione.
--
-- Questo file sta in un repository pubblico: la password qui sotto è nota a
-- chiunque. Applicarlo in produzione crea un account con credenziali
-- pubbliche su un sistema che gestisce pagamenti e dati dei clienti.
--
-- Password utente demo: "demo1234"
-- (hash bcrypt reale sotto, generato con bcryptjs — per rigenerarne uno
-- nuovo: node -e "console.log(require('bcryptjs').hashSync('nuova-password', 10))"
-- dentro apps/dashboard, dove bcryptjs è già installato).

insert into users (id, email, password_hash, name) values
  ('00000000-0000-0000-0000-000000000001', 'demo@ristorante.test',
   '$2a$10$Sbl3wS5wpzNlbOF/Xp51ZOneIUKps7ibcZceQuzfyeA7PmyLNbrBm',
   'Demo Owner');

insert into venues (id, owner_id, name, slug, vat_number, currency) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
   'Trattoria Demo', 'trattoria-demo', 'IT00000000000', 'EUR');

insert into venue_staff (venue_id, user_id, role) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'owner');

insert into tables (id, venue_id, code, seats, qr_token) values
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010', 'T1', 4, 'demo-qr-token-t1'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 'T2', 2, 'demo-qr-token-t2');

insert into menu_categories (id, venue_id, name, sort_order) values
  ('00000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000010', 'Antipasti', 1),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000010', 'Primi', 2),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000010', 'Bevande', 3);

insert into menu_items (venue_id, category_id, name, description, price_cents, vat_rate, sort_order) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000200', 'Bruschetta', 'Pomodoro e basilico', 600, 10, 1),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000201', 'Carbonara', 'Guanciale, uovo, pecorino', 1200, 10, 1),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000202', 'Acqua naturale 0.5L', null, 200, 10, 1);
