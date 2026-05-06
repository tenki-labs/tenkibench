# Bidrag til TenkiBench

Takk for at du vil bidra. Tre måter:

## 1. Foreslå en oppgave

Beste form: åpne en pull request med ny YAML-fil i riktig `tasks/<kategori>/`-mappe.

Fil-navn = `<id>.yaml`, der `<id>` er `<kategori>-<NNN>`.

Krav:
- Følg skjema i [docs/TESTING_METHODOLOGY.md](TESTING_METHODOLOGY.md) §3
- Skriv en `rationale` (≥40 tegn) som forklarer hvorfor oppgaven er typisk SMB-arbeid
- Hvis basert på reell sak: anonymiser fullstendig (`source: anonymized`)
- Kjør `pnpm tasks:validate` lokalt før push

## 2. Valider en kategori

Vi søker norske fagpersoner som vil gjennomgå 30–60 oppgaver i sin kategori og signere validering. Vi betaler 1500 NOK/time, anslått 4–10 timer per kategori.

Profiler vi trenger:

| Kategori | Profil |
|---|---|
| `kontrakt`, `lov-referanse` | Advokat med erfaring fra avtaler/SMB |
| `mva-skatt`, `faktura` | Statsautorisert regnskapsfører |
| `hr-lonn` | HR-rådgiver eller arbeidsrettsadvokat |
| `bokmal-nynorsk` | Språkviter eller statsautorisert translatør |
| `kundeservice` | Person med erfaring fra kunde-support |
| `brreg` | Generelt — kjennskap til norsk selskapsrett |

Send e-post til <einar@tenki.no> med en kort intro.

## 3. Rapporter en feil

- **Feil i fasit:** GitHub issue, tag `task-error`, lim inn `id` og forslag til riktig svar.
- **Feil i metodikk:** GitHub issue, tag `methodology`. Vi diskuterer åpent før endring.
- **Feil i kode:** vanlig issue eller PR.

## Kode-konvensjoner

- TypeScript, strict mode
- Bokmål i UI; engelsk i kommentarer + variabelnavn
- Hver server-action ender med `redirect(...)` (ingen returnerte JSON-respons fra server actions)
- Migrasjoner er idempotente (`if not exists`, `on conflict do nothing`)
- Aldri commit secrets — `.gitleaks.toml` blokkerer

## Pull request-flyt

1. Fork → branch `feat/<kort-navn>` eller `fix/<kort-navn>`
2. Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`
3. PR med beskrivelse av hva og hvorfor
4. Vi gjennomgår innen 5 virkedager
