# TenkiBench

**Norsk SMB-evaluering for språkmodeller.** Live: [bench.tenki.no](https://bench.tenki.no)

TenkiBench tester hvor godt store språkmodeller faktisk fungerer for norske små og mellomstore bedrifters arbeid: faktura-tolkning, kontrakts-analyse, MVA og skatt, lovreferanser, Brønnøysund-spørringer, HR-saker, kundeservice-tone, og oversettelse mellom Bokmål og Nynorsk.

Alle oppgaver, evalueringskode og resultater er åpne. Modell-leverandører betaler ikke for å bli evaluert. [Les metodikken.](docs/TESTING_METHODOLOGY.md)

## Hva som testes

| Kategori | Beskrivelse | Eval-metode |
|---|---|---|
| `faktura` | Norske fakturaer: total, MVA, KID, forfall, utsteder | numerisk + regex |
| `kontrakt` | NDA, leveranseavtaler, arbeidsavtaler — finn risikable klausuler | LLM-dommer + rubrikk |
| `mva-skatt` | MVA-beregning, fradrags-spørsmål, skatteplikt | numerisk + regex |
| `lov-referanse` | Sitering av norsk lovgivning (Lovdata-fasit) | regex + struktur |
| `brreg` | Brønnøysund-spørringer: org-data, signatur, roller | JSON-skjema |
| `hr-lonn` | Arbeidstid, sykepenger, ferie, oppsigelse | LLM-dommer |
| `kundeservice` | Bokmål kundeservice-svar — høflighet, klarhet, nøyaktighet | LLM-dommer |
| `bokmal-nynorsk` | Oversettelse begge veier | LLM-dommer + ekspert |

## Stack

- Next.js 16 (standalone) + Tailwind + shadcn-stil komponenter
- PostgreSQL (egen DB i delt Supabase-instans på tenki-VPS)
- OpenAI SDK rettet mot Mammouth.ai for samlet modell-tilgang
- Recharts for grafer, TanStack Table for tabeller
- Caddy (delt edge på `/opt/edge/`) for TLS

## Lokalt oppsett

```bash
pnpm install
cp .env.example .env.local
# fyll inn DATABASE_URL, MAMMOUTH_API_KEY, ADMIN_TOKEN, CRON_TOKEN
pnpm db:migrate
pnpm tasks:validate
pnpm dev
```

Åpne <http://localhost:3000> for offentlig leaderboard, <http://localhost:3000/admin> for admin (krever `ADMIN_TOKEN`-cookie).

## Kjør benchmark

```bash
# Mot én modell, alle kategorier
pnpm bench:run --model=gpt-5 --provider=mammouth

# Mot alle aktive modeller
pnpm bench:run-all

# Bare én kategori
pnpm bench:run --model=claude-opus-4-7 --category=faktura
```

## Bidra

- **Foreslå oppgave:** se [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- **Valider en kategori:** vi søker eksperter — se [docs/PARTNERS.md](docs/PARTNERS.md)
- **Rapporter en feil i fasit:** åpne issue med tag `task-error`

## Lisens

- Kode: MIT
- Oppgaver: CC BY 4.0 (sitering kreves)
- Hold-out-set: ikke offentlig

## Eier

Tenki Labs AS · [tenki.no](https://tenki.no) · einar@tenki.no
