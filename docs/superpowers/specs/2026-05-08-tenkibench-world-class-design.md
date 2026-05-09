# TenkiBench — vei mot world-class · design (2026-05-08)

## Mål

TenkiBench skal kunne siteres ved siden av MMLU, HELM, GPQA, Chatbot Arena
i akademisk og industriell kontekst. "Den autoritative norske SMB-LLM-testen."

## Kriterier for "world-class"

| # | Kriterium | Akseptkrav |
|---|---|---|
| 1 | Volum | ≥ 500 oppgaver, fordelt på 11+ benches |
| 2 | Validering | Hver kategori med ≥ 1 navngitt ekstern fagperson |
| 3 | Hold-out | 20% av hver bench i hemmelig sett, rotert kvartalsvis |
| 4 | Kalibrering | Pearson r ≥ 0.8, MAE ≤ 0.15 mot menneske-dommere |
| 5 | Reproduserbarhet | Pinned modell-versjoner, hash av prompts, seed |
| 6 | Distribusjon | HF-dataset, paper-utkast, presse-pakke, CC-BY 4.0 |
| 7 | API + eksport | JSON, CSV, JSONL, BibTeX |
| 8 | Continuous scoring | Auto-refresh ekstern data 24t |
| 9 | Community | Pull-request-validering, validator-program |
| 10 | SSO | Enterprise-grade auth (Tenki OIDC) |

## Nåværende status (v0.6)

- 86 oppgaver, 23 reasoning, 11 benches med innhold
- 3 eksterne kilder integrert (AA, LMArena, OpenLLM)
- Søk + filter, knowledge/reasoning split scoring
- SSO cookie-delt klar, OIDC ikke
- 0 eksterne validatorer, 0 hold-out, 0 kalibreringsdata

## Approach: hybrid plattform-først + distribusjon

Bygger plattform-egenskaper (sub-prosjekter 1-7) som lar oss skalere uten
manuelt arbeid, kjører deretter distribusjons-stunten med whatever volum vi
har. Volum-arbeid skjer parallelt via community + dedikert forfatter-uke.

## Sub-prosjekter (parallelliserbare hvor merket)

### 1. Auto-refresh av eksterne scores [P, 1h]
- Migration: `system_settings` tabell med boolean `external_scores_auto_refresh_enabled` (default true)
- Cron-rute kjører hver 24t, hopper hvis flagget av
- Admin-toggle-side på `/admin/eksterne-scores`
- Logger siste auto-refresh-tid

### 2. SSO OIDC full-implementering [P, 3h]
- Redirect-URI: `https://bench.tenki.no/api/auth/callback`
- Webhook-URI: `https://bench.tenki.no/api/auth/webhook`
- `/api/auth/login` initierer OIDC-flow
- `/api/auth/callback` exchanger code → tokens, setter cookies
- `/api/auth/webhook` mottar logout/role-events fra sentral
- Erstatter middleware-cookie-sjekk med begge mekanismer (cookie først, OIDC fallback)

### 3. HuggingFace dataset-publisering [P, 2h]
- Eksport-script: `pnpm export:hf` lager `dist/tenkibench-hf/` med:
  - `dataset.json` (HF-format)
  - `dataset_card.md`
  - Per-split JSONL (knowledge/reasoning)
- GitHub Action: ved tag-push, push til `tenki-labs/tenkibench-dataset` HF repo
- README med BibTeX-blokk

### 4. Hold-out-system med eksempel-tasks [P, 2h]
- `tasks-holdout/` (gitignored, deployed via scp)
- Auto-genererer `holdout-manifest.json` med hashes + counts
- Public side `/holdout` viser kun hashes + counts (ingen oppgave-tekst)
- Runner kan kjøres med `--holdout-only`-flag
- 10 eksempel-tasks i hold-out (en per stor bench)

### 5. Judge calibration: bulk-import + statistikk [P, 1.5h]
- CSV-upload på `/admin/dommer-kalibrering`
- Compute Pearson r, MAE, bias automatisk
- Per-kategori-disaggregering
- Eksport av kalibrerings-data som offentlig CSV

### 6. Standard format-eksport [P, 1h]
- `/api/public/runs/[id]?format=jsonl|csv|json` (csv + json finnes)
- `/api/public/dataset?format=jsonl` for hele oppgave-databasen
- BibTeX-blokk på `/metodikk` for sitering

### 7. Validator-recruitment-side + database [P, 1.5h]
- `/validator/registrer` public form med felt: navn, e-post, fagfelt, LinkedIn
- Lagres i ny `validator_applications` tabell
- Admin ser køen på `/admin/validatorer`, kan godkjenne/avvise
- Godkjente validatorer vises på `/validatorer`
- Per-oppgave kan koble til validators via FK

### 8. Volum-author 30 nye reasoning-oppgaver [Sub-content, 3h]
- 5 per bench for de svakest dekkete (extraction, tool-use, gdpr, safety, finance, language)
- Følger eksisterende mønster

## Eksekverings-rekkefølge

1. **Parallell batch (subagenter):** sub-prosjekt 1, 3, 4, 5, 6 (5 subagenter, alle uavhengige)
2. **Etter batch 1:** sub-prosjekt 2 (SSO — krever litt rundt-tenking i middleware)
3. **Etter batch 1:** sub-prosjekt 7 (validator-system, kobler til oppgave-tabellen)
4. **Innholds-arbeid:** sub-prosjekt 8 (forfattere-tasks, kan gå parallelt med alt)

## Det som ikke er i denne pakken

Eksplisitt YAGNI'd:

- Multi-tenant per-customer benches (vi har én bench-leverandør: Tenki)
- Mobile app
- Real-time WebSocket score-updates
- Admin-slettelogger med backup
- IRB-godkjenning, etisk komité
- Ko-publisering med universitet
- Akademisk paper med peer-review (kommer som separat prosjekt etter v1.0)

## Suksess-måling

Etter alle 8 sub-prosjekter er ferdige:
- Build grønt, alle ruter live
- ≥ 5 benches har validator-rekruttering aktiv
- Auto-refresh kjører nattlig
- HF-dataset publisert med ≥ 100 tasks
- BibTeX-blokk på /metodikk
- SSO redirect funker
- Hold-out-manifest live på /holdout
- 30 nye reasoning-oppgaver (totalt ~110+)
