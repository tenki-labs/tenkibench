import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";

export const metadata = { title: "Metodikk · TenkiBench" };

export default function MetodikkPage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 prose prose-neutral">
        <div className="eyebrow mb-3">Metodikk</div>
        <h1 className="h1 mb-8">Hvordan TenkiBench fungerer</h1>

        <h2 className="h2 mt-10 mb-4">Hva vi måler</h2>
        <p>
          TenkiBench evaluerer hvor godt språkmodeller utfører konkrete oppgaver
          som er typiske for norske SMB-er: tolke fakturaer, vurdere kontrakter,
          beregne MVA, sitere norsk lov, hente Brønnøysund-data, svare på HR-spørsmål,
          skrive kundeservice-svar og oversette mellom Bokmål og Nynorsk.
        </p>
        <p>
          Vi måler <em>ikke</em> generell intelligens, kreativ skriving eller koding.
          Disse er dekket av MMLU, GPQA, FrontierMath, HumanEval og lignende. Vår
          jobb er å svare på <em>én</em> ting: <strong>fungerer denne modellen i en norsk SMB-kontekst?</strong>
        </p>

        <h2 className="h2 mt-10 mb-4">Eval-metoder</h2>
        <ul className="list-disc pl-6">
          <li><code>numeric_exact</code> — tall-utdragning + toleranse (faktura, MVA)</li>
          <li><code>regex</code> / <code>regex_all</code> — én eller flere regex-mønstre må treffe (lov-§)</li>
          <li><code>exact_string</code> — eksakt tekst-match (etter trimming)</li>
          <li><code>json_schema</code> — strukturert JSON, dypsammenlignet (Brreg)</li>
          <li><code>llm_judge</code> — sterk modell vurderer mot rubrikk (kontrakt, kundeservice, oversettelse)</li>
        </ul>
        <p>
          LLM-dommer kalibreres mot menneske-dommere. Avvik &gt; 0.15 i gjennomsnitt
          fører til at vi bytter dommer-modell eller skriver om rubrikken.
          Kalibrerings-data er offentlig.
        </p>

        <h2 className="h2 mt-10 mb-4">Score</h2>
        <p>
          Hver oppgave gir en score mellom 0.000 og 1.000. Per-kategori-score er gjennomsnittet
          av oppgavene i kategorien. Total-score er et vektet gjennomsnitt over kategorier,
          der vekten reflekterer hvor mye reell SMB-tid kategorien dekker:
        </p>
        <ul className="list-disc pl-6">
          <li>Kontrakt-analyse: 1.5</li>
          <li>Lov-referanse: 1.3</li>
          <li>MVA og skatt: 1.2</li>
          <li>Faktura, HR/lønn: 1.0</li>
          <li>Brreg: 0.8</li>
          <li>Kundeservice: 0.7</li>
          <li>Bokmål↔Nynorsk: 0.5</li>
        </ul>

        <h2 className="h2 mt-10 mb-4">Anti-leakage</h2>
        <p>
          80% av oppgavene er offentlige (alle vises på <Link href="/oppgaver" className="underline">/oppgaver</Link>).
          20% holdes hemmelig. Den hemmelige settet kjøres kun internt og brukes til
          å oppdage modeller som er trent på testen.
          Alle prompts og fasit hashes og publiseres på{" "}
          <Link href="/holdout" className="underline">/holdout</Link>.
        </p>

        <h2 className="h2 mt-10 mb-4">Reproduserbarhet</h2>
        <p>
          Hver kjøring lagrer: modell-versjon, prompt-hash, temperatur, seed,
          dommer-modell, råe svar, evaluerings-output. Alt eksponeres via
          <Link href="/api/public/leaderboard" className="underline ml-1">det offentlige API&apos;et</Link>.
        </p>

        <h2 className="h2 mt-10 mb-4">Validering av oppgaver</h2>
        <p>
          Hver kategori valideres av minst én ekstern fagperson:
          advokat (kontrakt, lov-referanse), regnskapsfører (faktura, MVA, skatt),
          HR-rådgiver (HR/lønn), språkviter (Bokmål↔Nynorsk).
          Validatorene navngis på hver oppgave-side.
        </p>

        <h2 className="h2 mt-10 mb-4">Hva vi ikke gjør</h2>
        <ul className="list-disc pl-6">
          <li>Vi tar <strong>aldri</strong> betalt fra modell-leverandører for evaluering eller plassering.</li>
          <li>Vi lager ikke modell-anbefalinger til kunder uten å informere om at vår konsulentvirksomhet kan ha interesse.</li>
          <li>Vi reklamerer ikke på leaderboard-sider.</li>
        </ul>

        <h2 className="h2 mt-10 mb-4">Versjonering</h2>
        <p>
          TenkiBench versjoneres semantisk (major.minor.patch). Alle resultater er taggset med
          <code className="ml-1">bench_version</code> så historiske kjøringer er sammenlignbare innen samme versjon.
        </p>

        <h2 className="h2 mt-10 mb-4">Kildekode</h2>
        <p>
          Alt: oppgaver, eval-engine, leaderboard. <Link href="https://github.com/tenki-labs/tenkibench" className="underline">github.com/tenki-labs/tenkibench</Link>
        </p>

        <h2 className="h2 mt-10 mb-4">Sitering</h2>
        <p>
          TenkiBench er CC-BY 4.0. Bruk gjerne i forskning, anbud eller intern evaluering —
          krediter oss. BibTeX, APA, MLA og dataset-nedlasting på{" "}
          <Link href="/sitere" className="underline">/sitere</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
