# Gestionale ristoranti e bar

Lingua: italiano. Cartella: `/Users/md/GESTIONALE RISTORANTI`
Repository **pubblico**: https://github.com/Marco26-hub/prenotazioni_ristoranti_bar

Prodotto white-label per ristoranti italiani: il cliente inquadra un QR al
tavolo, legge il menu, ordina e paga; il locale ha un gestionale con comande,
sala, prenotazioni, fatturazione e registratore telematico.

**È in produzione e ci sono clienti veri.**

## Leggi questo per primo

**`.claude/skills/gestionale-ristoranti/SKILL.md`** — comandi, convenzioni e
le trappole che sono già costate soldi o lavoro. Molte non si deducono
leggendo i file, e due hanno già mandato in produzione conti sbagliati.

Poi, se serve contesto:

- `HANDOFF.md` — il diario del progetto. Le sezioni 1-9 descrivono com'è
  fatto; quelle datate in fondo raccontano cosa è cambiato e perché. Parti
  dall'ultima.
- `docs/GO-LIVE.md` — cosa manca per incassare davvero
- `docs/LINGUE.md` — i due sistemi di traduzione, da non confondere
- `docs/REGIONE.md` — perché le funzioni girano a Francoforte
- Mappa globale progetti: `~/.codex/PROJECTS.md`

## Stack

pnpm monorepo, Next.js 16 App Router, Postgres su Neon, Auth.js v5,
Playwright. `apps/guest` è il lato cliente, `apps/dashboard` il gestionale e
il pannello di piattaforma, `packages/shared` ciò che condividono.

## Le cinque regole che non si violano

1. **Il conto si calcola in un posto solo**, `packages/shared/conto.ts`.
   Scritto in quattro posti, una volta la sala diceva 168 € e la cassa ne
   registrava 64.
2. **Dopo ogni modifica allo schema**, `node db/confronta.mjs`: confronta
   colonne, indici **e vincoli**. Dimenticarlo è già costato due volte, e
   tutte e due per un CHECK, non per una colonna.
3. **Ogni Server Action e ogni rotta API è un POST pubblico.** Il controllo va
   nella rotta, non nel bottone.
4. **Nessun segreto nei file committati.** Il repo è pubblico; un segreto
   finito lì va considerato bruciato e ruotato, non solo rimosso.
5. **Niente fallback silenziosi**: ogni rifiuto o salto va nel log col motivo.
   E non dichiarare fatto quello che non hai visto funzionare — compilare non
   è funzionare.

## Prima di spingere

```bash
pnpm build
DATABASE_URL="…" npx playwright test     # i due server locali devono girare
DATABASE_URL="…" node db/confronta.mjs
```

Chiedi conferma prima di push o deploy: ogni push rilascia in produzione.
