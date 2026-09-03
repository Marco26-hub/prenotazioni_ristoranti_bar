/**
 * Costruisce la guida interattiva come pagina unica.
 *
 * Le immagini finiscono dentro l'HTML come data URI: la guida deve poter
 * essere aperta, salvata e girata a un ristoratore senza portarsi dietro una
 * cartella di file che al primo inoltro si perde.
 */

import { readFileSync, writeFileSync } from "node:fs";

const passi = JSON.parse(readFileSync("guida/src/passi.json", "utf8"));

const dataUri = (f) =>
  "data:image/jpeg;base64," +
  readFileSync(`guida/public/${f}`).toString("base64");

const capitoli = [];
for (const p of passi) {
  let c = capitoli.find((x) => x.nome === p.capitolo);
  if (!c) capitoli.push((c = { nome: p.capitolo, passi: [] }));
  c.passi.push(p);
}

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let i = 0;
const slide = passi
  .map((p) => {
    i += 1;
    return `<article class="passo" id="p${i}" data-lato="${p.telefono ? "cliente" : "locale"}" hidden>
  <header class="passo-testa">
    <p class="eyebrow"><span class="conta">${String(i).padStart(2, "0")}</span><span class="sep"></span>${esc(p.capitolo)}<span class="lato">${p.telefono ? "Cliente" : "Locale"}</span></p>
    <h2>${esc(p.titolo)}</h2>
    <p class="dettaglio">${esc(p.dettaglio)}</p>
  </header>
  <figure class="scatto ${p.telefono ? "telefono" : "schermo"}">
    <button class="lente" type="button" aria-label="Ingrandisci la schermata">
      <img src="${dataUri(p.immagine)}" alt="${esc(p.titolo)}" loading="lazy" decoding="async">
    </button>
    <figcaption>Tocca l&rsquo;immagine per ingrandirla</figcaption>
  </figure>
</article>`;
  })
  .join("\n");

let j = 0;
const indice = capitoli
  .map(
    (c, ci) => `<li class="cap">
  <p class="cap-nome"><span class="cap-num">${ci + 1}</span>${esc(c.nome)}</p>
  <ol class="cap-passi">
    ${c.passi
      .map((p) => {
        j += 1;
        return `<li><button type="button" data-va="${j}" data-lato="${p.telefono ? "cliente" : "locale"}"><span class="pt">${String(j).padStart(2, "0")}</span>${esc(p.titolo)}</button></li>`;
      })
      .join("\n    ")}
  </ol>
</li>`
  )
  .join("\n");

const html = `<title>Ordina e paga al tavolo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
/* Palette calda da locale: fondo espresso, brace per il lato locale, salvia
   per il lato cliente. Il colore non decora, dice da che parte dello schermo
   si sta guardando. */
:root {
  --ground: #faf6f1;
  --surface: #fffdfa;
  --raised: #f3ece4;
  --line: #e0d5c8;
  --ink: #1d1712;
  --muted: #7d6d61;
  --ember: #c2551f;
  --sage: #3d7a5b;
  --shadow: 24px 40px 80px -40px rgba(45, 30, 20, .35);
  --lato: var(--ember);
}
:root:not([data-theme="light"]) {
  @media (prefers-color-scheme: dark) {
    --ground: #171310;
    --surface: #211b17;
    --raised: #2b231d;
    --line: #3a2f28;
    --ink: #f2ece5;
    --muted: #a4948a;
    --ember: #e2703a;
    --sage: #6fb28a;
    --shadow: 24px 40px 80px -40px rgba(0, 0, 0, .8);
  }
}
:root[data-theme="dark"] {
  --ground: #171310;
  --surface: #211b17;
  --raised: #2b231d;
  --line: #3a2f28;
  --ink: #f2ece5;
  --muted: #a4948a;
  --ember: #e2703a;
  --sage: #6fb28a;
  --shadow: 24px 40px 80px -40px rgba(0, 0, 0, .8);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font: 400 17px/1.6 "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.guscio { display: grid; grid-template-columns: 310px minmax(0, 1fr); min-height: 100vh; }

/* --- Indice ------------------------------------------------------- */
.indice {
  border-right: 1px solid var(--line);
  background: var(--surface);
  padding: 30px 22px 40px;
  position: sticky; top: 0; align-self: start; max-height: 100vh; overflow-y: auto;
}
.marchio { font-family: "Bricolage Grotesque", ui-sans-serif, sans-serif; font-weight: 800; font-size: 21px; letter-spacing: -.02em; margin: 0; line-height: 1.15; }
.sottomarchio { color: var(--muted); font-size: 13px; margin: 6px 0 26px; }

.indice ol, .indice ul { list-style: none; margin: 0; padding: 0; }
.cap + .cap { margin-top: 22px; }
.cap-nome {
  display: flex; align-items: center; gap: 9px; margin: 0 0 8px;
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 11px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted);
}
.cap-num {
  width: 19px; height: 19px; border-radius: 50%; border: 1px solid var(--line);
  display: grid; place-items: center; font-size: 10px; color: var(--ink);
}
.cap-passi li + li { margin-top: 1px; }
.cap-passi button {
  display: flex; gap: 9px; width: 100%; text-align: left; align-items: baseline;
  background: none; border: 0; border-radius: 8px; padding: 7px 9px;
  color: var(--muted); font: inherit; font-size: 14.5px; line-height: 1.35; cursor: pointer;
  border-left: 2px solid transparent; transition: background .12s, color .12s;
}
.cap-passi button:hover { background: var(--raised); color: var(--ink); }
.cap-passi button[aria-current="true"] {
  background: var(--raised); color: var(--ink); font-weight: 500;
  border-left-color: var(--ember);
}
.cap-passi button[aria-current="true"][data-lato="cliente"] { border-left-color: var(--sage); }
.pt { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }

/* --- Lettura ------------------------------------------------------ */
.lettura { padding: 46px 48px 130px; max-width: 1000px; }
.passo[data-lato="cliente"] { --lato: var(--sage); }

.eyebrow {
  display: flex; align-items: center; gap: 11px; flex-wrap: wrap; margin: 0 0 14px;
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 11.5px; letter-spacing: .15em; text-transform: uppercase; color: var(--muted);
}
.conta { color: var(--lato); font-weight: 500; font-variant-numeric: tabular-nums; }
.sep { width: 16px; height: 1px; background: var(--line); }
.lato {
  margin-left: auto; border: 1px solid var(--lato); color: var(--lato);
  border-radius: 999px; padding: 3px 11px; letter-spacing: .1em; font-size: 10.5px;
}
.passo h2 {
  font-family: "Bricolage Grotesque", ui-sans-serif, sans-serif;
  font-weight: 700; font-size: clamp(30px, 4vw, 44px); line-height: 1.08;
  letter-spacing: -.025em; margin: 0; text-wrap: balance;
}
.dettaglio { color: var(--muted); font-size: 18px; max-width: 62ch; margin: 15px 0 0; }

.scatto { margin: 34px 0 0; }
.lente {
  padding: 0; border: 0; background: none; cursor: zoom-in; display: block; width: 100%;
  border-radius: 16px;
}
.lente img {
  display: block; width: 100%; height: auto; border-radius: 14px;
  border: 1px solid var(--line); box-shadow: var(--shadow);
}
.scatto.telefono .lente { max-width: 380px; }
.scatto.telefono .lente img { border-radius: 26px; }
.scatto figcaption { color: var(--muted); font-size: 13px; margin-top: 12px; }

/* --- Barra di navigazione ------------------------------------------ */
.barra {
  position: fixed; inset: auto 0 0 310px; z-index: 5;
  display: flex; align-items: center; gap: 16px;
  padding: 13px 48px calc(13px + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  border-top: 1px solid var(--line); backdrop-filter: blur(10px);
}
.barra button {
  min-height: 44px; padding: 0 20px; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 15px; font-weight: 500;
  border: 1px solid var(--line); background: var(--surface); color: var(--ink);
}
.barra button:hover:not(:disabled) { border-color: var(--ember); }
.barra button:disabled { opacity: .38; cursor: default; }
.barra .avanti { background: var(--ember); border-color: var(--ember); color: #fff; }
.stato { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
.pista { flex: 1; height: 3px; border-radius: 3px; background: var(--line); overflow: hidden; }
.pista i { display: block; height: 100%; background: var(--ember); transition: width .3s ease; }

/* --- Ingrandimento -------------------------------------------------- */
dialog.zoom { border: 0; padding: 0; background: none; max-width: 100vw; max-height: 100vh; }
dialog.zoom::backdrop { background: rgba(10, 7, 5, .93); }
dialog.zoom img { display: block; max-width: 96vw; max-height: 94vh; border-radius: 12px; }
dialog.zoom button {
  position: fixed; top: 18px; right: 18px; min-height: 44px; min-width: 44px;
  border-radius: 999px; border: 1px solid rgba(255,255,255,.3); cursor: pointer;
  background: rgba(0,0,0,.55); color: #fff; font: inherit; font-size: 20px;
}

.apri-indice { display: none; }

:focus-visible { outline: 2px solid var(--ember); outline-offset: 3px; border-radius: 6px; }

@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }

@media (max-width: 900px) {
  .guscio { grid-template-columns: 1fr; }
  .indice {
    position: fixed; inset: 0 auto 0 0; width: min(310px, 86vw); z-index: 20;
    transform: translateX(-101%); transition: transform .22s ease; max-height: 100dvh;
  }
  .indice[data-aperto="1"] { transform: none; box-shadow: 0 0 60px rgba(0,0,0,.5); }
  .apri-indice {
    display: inline-flex; align-items: center; gap: 8px; min-height: 44px;
    padding: 0 15px; border-radius: 999px; border: 1px solid var(--line);
    background: var(--surface); color: var(--ink); font: inherit; font-size: 14px; cursor: pointer;
  }
  .lettura { padding: 22px 20px 120px; }
  .barra { inset: auto 0 0 0; padding: 11px 16px calc(11px + env(safe-area-inset-bottom)); gap: 10px; }
  .barra button { padding: 0 15px; font-size: 14px; }
  .stato { display: none; }
  .scatto.telefono .lente { max-width: 100%; }
}
</style>

<div class="guscio">
  <nav class="indice" id="indice" aria-label="Indice della guida">
    <p class="marchio">Ordina e paga al tavolo</p>
    <p class="sottomarchio">${passi.length} passaggi, dalla preparazione del locale alla fattura. Schermate reali del gestionale.</p>
    <ul>
${indice}
    </ul>
  </nav>

  <main class="lettura">
    <p style="margin:0 0 20px"><button class="apri-indice" type="button" id="tastoIndice" aria-expanded="false" aria-controls="indice">☰ Indice</button></p>
${slide}
  </main>
</div>

<div class="barra">
  <button type="button" id="prec">← Indietro</button>
  <div class="pista"><i id="pista"></i></div>
  <span class="stato" id="stato"></span>
  <button type="button" class="avanti" id="succ">Avanti →</button>
</div>

<dialog class="zoom" id="zoom">
  <button type="button" id="chiudiZoom" aria-label="Chiudi">×</button>
  <img alt="">
</dialog>

<script>
(function () {
  var passi = Array.prototype.slice.call(document.querySelectorAll(".passo"));
  var voci = Array.prototype.slice.call(document.querySelectorAll(".cap-passi button"));
  var totale = passi.length;
  var prec = document.getElementById("prec");
  var succ = document.getElementById("succ");
  var stato = document.getElementById("stato");
  var pista = document.getElementById("pista");
  var indice = document.getElementById("indice");
  var tastoIndice = document.getElementById("tastoIndice");
  var zoom = document.getElementById("zoom");
  var zoomImg = zoom.querySelector("img");
  var corrente = 0;

  // Il passo sta nell'indirizzo: chi manda il link a un collega manda il
  // punto in cui si trovava, e ricaricando non si riparte da capo.
  function daHash() {
    var m = /^#p(\\d+)$/.exec(location.hash);
    var n = m ? parseInt(m[1], 10) - 1 : 0;
    return n >= 0 && n < totale ? n : 0;
  }

  function mostra(n, scrivi) {
    corrente = Math.max(0, Math.min(totale - 1, n));
    passi.forEach(function (p, k) { p.hidden = k !== corrente; });
    voci.forEach(function (v, k) {
      if (k === corrente) v.setAttribute("aria-current", "true");
      else v.removeAttribute("aria-current");
    });
    prec.disabled = corrente === 0;
    succ.disabled = corrente === totale - 1;
    succ.textContent = corrente === totale - 1 ? "Fine" : "Avanti →";
    stato.textContent = (corrente + 1) + " / " + totale;
    pista.style.width = ((corrente + 1) / totale * 100) + "%";
    if (scrivi !== false) history.replaceState(null, "", "#p" + (corrente + 1));
    voci[corrente].scrollIntoView({ block: "nearest" });
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  prec.addEventListener("click", function () { mostra(corrente - 1); });
  succ.addEventListener("click", function () { mostra(corrente + 1); });

  voci.forEach(function (v) {
    v.addEventListener("click", function () {
      mostra(parseInt(v.dataset.va, 10) - 1);
      indice.removeAttribute("data-aperto");
      tastoIndice.setAttribute("aria-expanded", "false");
    });
  });

  tastoIndice.addEventListener("click", function () {
    var apre = indice.getAttribute("data-aperto") !== "1";
    if (apre) indice.setAttribute("data-aperto", "1");
    else indice.removeAttribute("data-aperto");
    tastoIndice.setAttribute("aria-expanded", String(apre));
  });

  document.addEventListener("click", function (e) {
    var b = e.target.closest(".lente");
    if (!b) return;
    zoomImg.src = b.querySelector("img").src;
    zoomImg.alt = b.querySelector("img").alt;
    zoom.showModal();
  });
  document.getElementById("chiudiZoom").addEventListener("click", function () { zoom.close(); });
  zoom.addEventListener("click", function (e) { if (e.target === zoom) zoom.close(); });

  document.addEventListener("keydown", function (e) {
    if (zoom.open) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); mostra(corrente + 1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); mostra(corrente - 1); }
    if (e.key === "Home") { e.preventDefault(); mostra(0); }
    if (e.key === "End") { e.preventDefault(); mostra(totale - 1); }
  });

  window.addEventListener("hashchange", function () { mostra(daHash(), false); });
  mostra(daHash(), false);
})();
</script>
`;

writeFileSync("guida/guida-interattiva.html", html);
console.log(
  `guida/guida-interattiva.html — ${passi.length} passaggi, ${capitoli.length} capitoli, ${(html.length / 1e6).toFixed(1)} MB`
);
