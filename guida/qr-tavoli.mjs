/**
 * Pagina con i QR veri dei tavoli liberi, da aprire sul portatile e
 * inquadrare col telefono. I QR sono generati dai token reali: inquadrandoli
 * si ordina davvero, non e una simulazione.
 */
import QRCode from "qrcode";
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

for (const riga of readFileSync("apps/dashboard/.env.local", "utf8").split("\n")) {
  const m = riga.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
const BASE = "https://ristoranti-guest.vercel.app";
const SLUG = "trattoria-da-luca";

const [v] = await sql`select id, name from venues where slug = ${SLUG}`;
const tavoli = await sql`
  select t.code, t.seats, t.qr_token, (ts.id is not null) as occupato
    from tables t
    left join table_sessions ts on ts.table_id = t.id and ts.status = 'open'
   where t.venue_id = ${v.id} and t.active = true
   order by t.code`;

const card = [];
for (const t of tavoli) {
  const url = `${BASE}/v/${SLUG}/t/${t.qr_token}`;
  const png = await QRCode.toDataURL(url, {
    width: 620,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#171310", light: "#ffffff" },
  });
  card.push({ code: t.code, seats: t.seats, url, png, occupato: t.occupato });
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const html = `<title>QR dei tavoli</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
:root {
  --ground:#faf6f1; --surface:#fffdfa; --line:#e0d5c8; --ink:#1d1712;
  --muted:#7d6d61; --ember:#c2551f; --sage:#3d7a5b;
}
:root:not([data-theme="light"]) { @media (prefers-color-scheme: dark) {
  --ground:#171310; --surface:#211b17; --line:#3a2f28; --ink:#f2ece5;
  --muted:#a4948a; --ember:#e2703a; --sage:#6fb28a;
}}
:root[data-theme="dark"] {
  --ground:#171310; --surface:#211b17; --line:#3a2f28; --ink:#f2ece5;
  --muted:#a4948a; --ember:#e2703a; --sage:#6fb28a;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);
  font:400 17px/1.6 "IBM Plex Sans",ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1180px;margin:0 auto;padding:46px 26px 90px}
h1{font-family:"Bricolage Grotesque",ui-sans-serif,sans-serif;font-weight:800;
  font-size:clamp(30px,5vw,46px);letter-spacing:-.03em;margin:0;line-height:1.06}
.occhiello{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12px;
  letter-spacing:.16em;text-transform:uppercase;color:var(--ember);margin:0 0 10px}
.guida{color:var(--muted);max-width:60ch;margin:16px 0 0}
.guida strong{color:var(--ink)}
.griglia{display:grid;gap:20px;margin-top:36px;
  grid-template-columns:repeat(auto-fill,minmax(248px,1fr))}
.tavolo{background:var(--surface);border:1px solid var(--line);border-radius:18px;
  padding:20px;display:flex;flex-direction:column;gap:13px}
.tavolo.presa{opacity:.5}
.testa{display:flex;align-items:center;justify-content:space-between;gap:10px}
.codice{background:#d9f99d;color:#171310;border-radius:11px;padding:3px 13px;
  font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:29px;letter-spacing:-.02em}
.posti{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12px;color:var(--muted)}
.qr{background:#fff;border-radius:12px;padding:11px;line-height:0}
.qr img{width:100%;height:auto;display:block}
.stato{font-size:13px;color:var(--sage);font-weight:500}
.stato.presa{color:var(--muted)}
.apri{display:flex;align-items:center;justify-content:center;min-height:44px;
  border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--ink);
  font-size:14px;font-weight:500}
.apri:hover{border-color:var(--ember)}
.nota{margin-top:44px;border-top:1px solid var(--line);padding-top:22px;
  color:var(--muted);font-size:14.5px;max-width:66ch}
@media print{
  body{background:#fff;color:#000}
  .guida,.apri,.nota{display:none}
  .tavolo{break-inside:avoid;border-color:#ccc}
}
:focus-visible{outline:2px solid var(--ember);outline-offset:3px}
</style>

<main>
  <p class="occhiello">${esc(v.name)}</p>
  <h1>Inquadra e ordina davvero</h1>
  <p class="guida">
    Questi sono i QR <strong>veri</strong> dei tavoli. Apri questa pagina sul
    portatile e inquadrane uno col telefono: si apre il menu, scegli i piatti
    con le <strong>quantità</strong>, lasci una <strong>nota per la cucina</strong>,
    ordini — e la comanda arriva in gestionale in pochi secondi.
    Non è una simulazione.
  </p>

  <div class="griglia">
${card
  .map(
    (t) => `    <div class="tavolo${t.occupato ? " presa" : ""}">
      <div class="testa">
        <span class="codice">${esc(t.code)}</span>
        <span class="posti">${t.seats} posti</span>
      </div>
      <div class="qr"><img src="${t.png}" alt="QR del tavolo ${esc(t.code)}"></div>
      <p class="stato${t.occupato ? " presa" : ""}">${
        t.occupato ? "Già occupato — si unisce al conto aperto" : "Libero: apre un conto nuovo"
      }</p>
      <a class="apri" href="${esc(t.url)}" target="_blank" rel="noreferrer">Apri senza scansionare</a>
    </div>`
  )
  .join("\n")}
  </div>

  <p class="nota">
    Un tavolo <strong>libero</strong> apre un conto nuovo. Un tavolo
    <strong>già occupato</strong> non ne apre un secondo: ti unisci al conto in
    corso, che è il comportamento giusto quando in quattro allo stesso tavolo
    inquadrano lo stesso QR. Per rimettere tutto com'era:
    <code>node db/servizio-prova.mjs --pulisci</code>
  </p>
</main>
`;

writeFileSync("guida/qr-tavoli.html", html);
console.log(`guida/qr-tavoli.html — ${card.length} tavoli, ${(html.length / 1e6).toFixed(1)} MB`);
console.log(`liberi: ${card.filter((t) => !t.occupato).map((t) => t.code).join(", ")}`);
await sql.end();
