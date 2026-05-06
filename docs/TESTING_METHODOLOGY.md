# TenkiBench — testmetodikk

**Versjon 0.1 · 2026-05-06**

Dette dokumentet beskriver hvordan TenkiBench-oppgaver konstrueres, evalueres og valideres. Vi skriver det ned slik at:

1. Norske journalister og fagpersoner kan kritisk vurdere benchmark'en før de siterer den.
2. Modell-leverandører kan forstå hva de blir testet på, og fileforslag til revisjon hvis de ser feil i fasit.
3. Eksterne validatorer (regnskapsførere, advokater, HR-rådgivere, språkvitere) har et felles rammeverk.
4. Bidragsytere kan lage nye oppgaver i samme stil.

---

## 1. Hva vi måler — og hva vi ikke måler

**Vi måler:** kvaliteten på en språkmodells utdata på *konkrete, etterprøvbare oppgaver* som er typiske i en norsk SMB-kontekst.

**Vi måler ikke:**
- Generell kunnskap (MMLU, GPQA dekker dette)
- Kreativ skriving
- Kodegenerering (HumanEval, SWE-bench)
- Matematisk resonnering på olympiade-nivå (FrontierMath)
- Multimodalt innhold (VQA-benchmarks)

**Vi gir oss ikke ut for å måle "intelligens" eller "agency" eller "AGI-progresjon".** Spørsmålet vi besvarer er: *Kan denne modellen brukes pålitelig av en norsk SMB?*

## 2. Kategori-design

Hver kategori representerer faktiske, gjentakende arbeidsoppgaver i norske SMB-er. Kategorien er gyldig hvis:

- Den dekker ≥ 1 time arbeid per uke i et typisk SMB
- Den krever norsk-spesifikk kunnskap (lov, valuta, MVA-regler, språk-konvensjoner) hvor utenlandske modeller plausibelt kan feile
- Det finnes en objektiv eller semi-objektiv fasit

**Vekter** (i total-score) reflekterer relativ tids-bruk og økonomisk konsekvens av feil:

| Kategori | Vekt | Begrunnelse |
|---|---|---|
| Kontrakts-analyse | 1.5 | Feil her kan koste hundretusener — verdt mer enn et raskt faktura-svar |
| Lov-referanse | 1.3 | Hallusinert lov-§ er tegn på modellen ikke kan brukes for compliance |
| MVA og skatt | 1.2 | Direkte regulert område, feil straffes |
| Faktura-tolkning | 1.0 | Høyt volum, lav per-feil-kostnad |
| HR og lønn | 1.0 | Mellom-volum, mellom-konsekvens |
| Brønnøysund | 0.8 | Strukturert, lavere risiko for feil |
| Kundeservice | 0.7 | Subjektiv, lavere konsekvens |
| Bokmål↔Nynorsk | 0.5 | Smal use-case |

Vekter publiseres på `/metodikk` og endres kun ved major versjons-bump.

## 3. Oppgave-anatomi

Hver oppgave er én YAML-fil i `tasks/<kategori>/<id>.yaml`. Påkrevde felt:

```yaml
id: <kategori>-<###>
category: <kategori-slug>
version: 1
title: <kort beskrivelse>
difficulty: easy | medium | hard | expert
rationale: |
  Forklaring (≥40 tegn) på hvorfor denne oppgaven representerer reelt SMB-arbeid.
  Hvilken person i hvilken type bedrift gjør dette? Hvor ofte? Hva koster en feil?
source: synthetic | anonymized | public-domain
source_notes: <fritekst, valgfritt>

system_prompt: <valgfritt — felles for alle modeller>
user_prompt: |
  <selve spørsmålet/oppgaven>
gold_answer: <forventet svar — eksakt, eller mal/eksempel for llm_judge>

eval:
  method: numeric_exact | regex | regex_all | exact_string | json_schema | llm_judge
  # ... metode-spesifikke felt

authored_by: <person eller @handle>
authored_at: <ISO-dato>
validated_by:    # valgfritt men anbefalt
  - name: <fagperson>
    role: advokat | regnskapsfører | HR-rådgiver | språkviter
    validated_at: <ISO-dato>
    comments: <fritekst>

tags: [mva-25, langkontekst, nynorsk, ...]
```

`scripts/validate-tasks.ts` håndhever skjemaet. Push'er som ikke validerer feiler i CI.

## 4. Eval-metoder

Valgt for hver oppgave basert på hva som er etterprøvbart.

### `numeric_exact`
For tall (faktura-totaler, MVA-beløp, prosenter).
Parser ut tall fra modellens svar, sammenlignes med fasit innen `tolerance` (default 0.01).
Norske tall-konvensjoner håndteres: `12 437,50` = `12437.50`.

### `regex` / `regex_all`
For svar med strukturert form (lov-§, datoer, KID-nummer).
`regex` matcher ett mønster; `regex_all` krever alle mønstre i array.

Eksempel: `^§ \d+-\d+(?:,? annet ledd)?$`

### `exact_string`
Trimmet streng-likhet. Brukes sjelden — primært for kontrollerte ja/nei-spørsmål.

### `json_schema`
For strukturerte svar (Brreg-data). Output må parse som JSON og dypsammenligne med fasit-objekt.

### `llm_judge`
Brukes der svar er friere (kontrakts-rødlining, kundeservice-skriving, oversettelse).

En **dommer-modell** (default: `claude-opus-4-7`) gis:
- Oppgaven
- Fasit-eksempelet
- Modellens svar
- En **rubrikk** med kriterier og vekter

Dommeren returnerer en score per kriterium (0.0–1.0) + en kort begrunnelse. Score sammenstilles til vektet totalscore for oppgaven.

**Rubrikker er offentlige.** Eksempel for kontrakts-rødlining:

```yaml
rubric:
  - criterion: identifiserer-risikoklausul
    weight: 0.4
    description: Modellen finner den faktiske risikoklausulen i fasit-svaret.
  - criterion: korrekt-juridisk-begrunnelse
    weight: 0.3
    description: Begrunnelsen siterer riktig lov-§ eller juridisk prinsipp.
  - criterion: aktuelt-norsk-kontekst
    weight: 0.2
    description: Svaret er relevant for norsk avtalerett (ikke amerikansk).
  - criterion: profesjonell-tone
    weight: 0.1
    description: Svaret er saklig, ikke overdreven, ikke feil-engelsk.
```

### Kalibrering av LLM-dommer

For hver oppgave-kategori med `llm_judge` kjører vi:

1. **Manuell scoring** av minst 30 modell-svar fra varierte modeller (vi rangerer 0.0–1.0)
2. **Dommer-scoring** av samme 30
3. **Pearson-korrelasjon + gjennomsnittlig absolutt-avvik (MAE)** mellom human og dommer

**Akseptkriterier:**
- Pearson r ≥ 0.8
- MAE ≤ 0.15

Hvis dommeren ikke møter kriteriene: vi (i prioritetsrekkefølge) (a) skriver om rubrikken, (b) bytter dommer-modell, (c) utelater kategori fra total-score til ny kalibrering er på plass.

Kalibrerings-data lagres i `judge_calibration`-tabellen og er offentlig via API.

## 5. Vansklighetsgradering

| Grad | Definisjon | Forventet score for sterk modell |
|---|---|---|
| `easy` | Direkte uthenting fra gitt input. En SMB-eier ville klart det. | 0.9+ |
| `medium` | Krever syntese eller anvendelse av en regel. | 0.7+ |
| `hard` | Krever fagkunnskap (regnskap, jus, HR). | 0.5+ |
| `expert` | Edge-cases der selv eksperter er uenige. | 0.2+ |

En kategori bør ha minst noe spredning (eks. 30% easy, 40% medium, 20% hard, 10% expert) for å skille modeller.

## 6. Anti-leakage

**Offentlig sett (80%):** alle oppgaver inkl. fasit eksponeres. Det er bevisst — folk skal kunne kritisere fasit, lære fra eksemplene, og oppdage modeller som er finetunet på akkurat våre prompts.

**Hold-out sett (20%):** ikke i git, deployes separat til VPS via scp. Brukes til:
- Verifisere at en modell ikke er trent på det offentlige settet
- Sertifiserings-kjøringer ("er denne modellen god nok?") på forespørsel

Hold-out konstrueres med samme metodikk og skjema som offentlig, og roteres kvartalsvis. Modeller som scorer betydelig høyere på offentlig enn hold-out (Δ > 0.1) flagges som mistenkelige og rapporteres åpent.

## 7. Reproduserbarhet

Hver kjøring lagrer:

- Modell-slug og versjon
- `bench_version` (git short-hash)
- `prompt_version` (sha256 av alle prompts brukt i denne kjøringen)
- Temperatur (alltid 0 for hovedscoring, dokumenteres ved unntak)
- Seed (når modellen støtter det)
- Dommer-modell (når llm_judge brukes)
- Råe svar fra modell og dommer
- Tokens inn/ut, latens, anslått kostnad

Alt eksponeres via `/api/public/leaderboard` og `/api/public/runs/<id>` (sistnevnte kommer i v0.2).

## 8. Validerings-prosess

For hver kategori søker vi minst én ekstern fagperson som validerer:

1. **Representativ-vurdering:** Er disse oppgavene typiske for arbeidet jeg gjør?
2. **Fasit-vurdering:** Er gull-svaret riktig? Hvis ikke, foreslå korreksjon.
3. **Vansklighets-kalibrering:** Er gradering rimelig?
4. **Anbefalt utvidelse:** Hvilke oppgavetyper mangler?

Validatoren krediteres i `validated_by`-feltet på hver oppgave hen har gjennomgått.

**Vi betaler for ekstern validering** (1500 NOK/time, anslått 4–10 timer per kategori).
Validatoren skriver under på at de ikke har økonomisk interesse i hvilken modell som scorer godt.

## 9. Versjonering

`<major>.<minor>.<patch>`

- **patch** (0.1.x): nye oppgaver, fiks i fasit, bedre dommer-rubrikk. Bryter ikke sammenligning.
- **minor** (0.x.0): ny kategori, endret scoring-formel. Markerer historiske kjøringer som "v0.1-data".
- **major** (x.0.0): grunnleggende metodikk-endring.

Endringer dokumenteres i `CHANGELOG.md`.

## 10. Hva vi ikke gjør

- **Vi tar aldri penger** fra modell-leverandører for evaluering, plassering, eller forhåndsvarsling om resultater.
- **Vi godtar ikke "vi fant en feil i oppgaven din etter at vi så scoren"** uten dokumentasjon — endring av fasit er en formell prosess (issue → diskusjon → patch-versjon).
- **Vi anbefaler ikke modeller** til kunder uten å eksplisitt informere om at vår konsulentvirksomhet kan ha kommersiell interesse.
- **Vi kjører ikke private benchmarks** for én kunde i hovedsporet — slike kontrakter er separate produkter.

## 11. Klage- og retting

Hvis du tror en oppgaves fasit er feil:

1. Åpne issue på GitHub med tag `task-error`, lim inn `id` og forklar
2. Vi diskuterer åpent
3. Hvis konsensus om feil: ny minor-versjon med oppdatert fasit, gamle scores merket som v-X-data.

Hvis du tror en eval-metode er urimelig:

1. Åpne issue med tag `methodology`
2. Forslag diskuteres åpent på GitHub før implementering

## 12. Nåværende kjente begrensninger

- **Ingen dialekt-dekning** ennå (Trøndersk, Bergensk, Nordnorsk). Hovedsporet er Bokmål-orientert.
- **LLM-dommer kalibrering pågår.** v0.1 publiseres med kalibreringsdata for kontrakt og kundeservice; HR/lønn og oversettelse kommer i v0.2.
- **Hold-out-set er ikke fullt rotert** før Q4 2026.
- **Cost-estimater er omtrentlige** når Mammouth-gateway-en ikke returnerer faktisk kost. Oppdateres kvartalsvis.

---

Spørsmål, kritikk, forslag: <einar@tenki.no> eller GitHub Issues.
