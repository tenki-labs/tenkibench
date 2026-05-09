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

## Datasett

Den åpne delen av oppgavesettet er publisert på HuggingFace:
<https://huggingface.co/datasets/tenki-labs/tenkibench>

```python
from datasets import load_dataset

# Hele datasettet (alle benches samlet)
ds = load_dataset("tenki-labs/tenkibench", "all")

# Bare norsk SMB-bench
smb = load_dataset("tenki-labs/tenkibench", "norwegian-smb")
```

Hold-out-settet er ikke med — det blir aldri publisert. Lokalt kan du
generere HF-eksporten med `pnpm export:hf` (skriver til
`dist/tenkibench-hf/`). Republisering skjer via GitHub Actions-jobben
`publish-hf.yml` (manuell trigger).

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

- **Kode:** MIT — se `LICENSE`.
- **Oppgaver, prompts, fasit, eval-resultater:** CC BY 4.0 — fri bruk, krever sitering.
- **Hold-out-set:** ikke offentlig. Brukes til å oppdage modeller trent på testen.
- **Modell-vekter:** vi distribuerer ingen. Modellene tilhører sine respektive eiere
  (OpenAI, Anthropic, Mistral, Meta, Alibaba, …) og er underlagt deres lisenser.
  TenkiBench rapporterer kun målte score.

## Sitering

Sitater-side med BibTeX, APA, MLA, lisens-detaljer og dataset-nedlasting:
[bench.tenki.no/sitere](https://bench.tenki.no/sitere).

```bibtex
@misc{tenkibench2026,
  title={TenkiBench: A Norwegian SMB Benchmark for Language Models},
  author={Holt, Einar and contributors},
  year={2026},
  url={https://bench.tenki.no},
  version={v0.6},
  note={CC-BY 4.0}
}
```

Hele datasettet kan lastes ned via `GET /api/public/dataset?format=json|jsonl|csv`.
Leaderboardet i samme formater: `GET /api/public/leaderboard?format=json|jsonl|csv`.

## Eier

Tenki Labs AS · [tenki.no](https://tenki.no) · einar@tenki.no
