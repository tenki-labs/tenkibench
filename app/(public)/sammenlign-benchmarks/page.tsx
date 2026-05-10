import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { MmluSample } from "@/lib/external-scores/mmlu-reference";
import type { HumanEvalSample } from "@/lib/external-scores/humaneval-reference";
import type { Gsm8kSample } from "@/lib/external-scores/gsm8k-reference";

export const metadata = {
  title: "Sammenlign benchmarks · TenkiBench",
  description:
    "TenkiBench tester norske SMB-scenarier. MMLU, GSM8K, HumanEval og Open LLM tester andre ting. Her ser du forskjellene side om side.",
};

interface SampleFile<T> {
  source: string;
  config: string;
  split: string;
  fetched_at: string;
  count: number;
  samples: T[];
}

async function loadJson<T>(filename: string): Promise<SampleFile<T> | null> {
  try {
    const target = path.join(process.cwd(), "data", filename);
    const raw = await fs.readFile(target, "utf8");
    return JSON.parse(raw) as SampleFile<T>;
  } catch {
    return null;
  }
}

interface BenchmarkRow {
  name: string;
  href?: string;
  domain: string;
  whatItTests: string;
  numTasks: string;
  language: string;
  evalMethod: string;
}

const BENCHMARKS: BenchmarkRow[] = [
  {
    name: "TenkiBench",
    href: "/metodikk",
    domain: "Norsk SMB-arbeid",
    whatItTests:
      "Faktura, kontrakt, MVA/skatt, lov-referanse, Brreg, HR/lønn, kundeservice, Bokmål↔Nynorsk",
    numTasks: "~250 oppgaver",
    language: "Bokmål + Nynorsk",
    evalMethod: "numerisk + regex + JSON-skjema + LLM-dommer",
  },
  {
    name: "MMLU",
    href: "https://huggingface.co/datasets/cais/mmlu",
    domain: "Generell multitask",
    whatItTests:
      "57 emner: jus, medisin, matte, historie, etikk, datalogi, fysikk, …",
    numTasks: "~14 000 spørsmål",
    language: "Engelsk",
    evalMethod: "flervalgs (4 alternativer)",
  },
  {
    name: "GSM8K",
    href: "https://huggingface.co/datasets/openai/gsm8k",
    domain: "Matematikk",
    whatItTests:
      "Grade-school flertrinns matte-tekstoppgaver — krever 2-8 regnetrinn",
    numTasks: "1 319 oppgaver i test-split",
    language: "Engelsk",
    evalMethod: "numerisk eksakt-match",
  },
  {
    name: "HumanEval",
    href: "https://huggingface.co/datasets/openai/openai_humaneval",
    domain: "Programmering",
    whatItTests:
      "Python-funksjoner: gitt en signatur og docstring, skriv implementasjonen",
    numTasks: "164 oppgaver",
    language: "Engelsk + Python",
    evalMethod: "kjør enhets-tester (pass@1)",
  },
  {
    name: "Open LLM Leaderboard",
    href: "https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard",
    domain: "Generell open-weight",
    whatItTests:
      "IFEval, BBH, MATH lvl 5, GPQA, MUSR, MMLU-Pro — aggregat for åpne modeller",
    numTasks: "~6 sub-benchmarks",
    language: "Hovedsakelig engelsk",
    evalMethod: "Per-task — varierer (lm-eval-harness)",
  },
];

export default async function SammenlignBenchmarksPage() {
  const [mmlu, humaneval, gsm8k] = await Promise.all([
    loadJson<MmluSample>("mmlu-sample.json"),
    loadJson<HumanEvalSample>("humaneval-sample.json"),
    loadJson<Gsm8kSample>("gsm8k-sample.json"),
  ]);

  const mmluPick = mmlu?.samples.slice(0, 3) ?? [];
  const humanevalPick = humaneval?.samples.slice(0, 2) ?? [];
  const gsm8kPick = gsm8k?.samples.slice(0, 3) ?? [];

  return (
    <>
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16">
        <div className="eyebrow mb-3">Sammenlign benchmarks</div>
        <h1 className="h1 mb-4">TenkiBench vs. internasjonale benchmarks</h1>
        <p className="text-tenki-muted max-w-2xl mb-10">
          TenkiBench dekker norsk SMB-arbeid. Det er én smal, dyp ting.
          MMLU, GSM8K, HumanEval og Open LLM Leaderboard tester noe helt
          annet — og det er bra. De gir et generelt øvre tak, vi sier hvor
          mye av det taket som faktisk når ned til en regnskapsfører i Trondheim.
        </p>

        <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted mb-3">
          Oversikt
        </div>
        <div className="border border-tenki-subtle bg-white rounded-xl overflow-hidden mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-tenki-subtle text-left">
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Benchmark</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Domene</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Hva testes</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Språk</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Eval</th>
              </tr>
            </thead>
            <tbody>
              {BENCHMARKS.map((b) => (
                <tr key={b.name} className="border-b border-tenki-subtle last:border-0 align-top">
                  <td className="px-4 py-3 font-medium">
                    {b.href?.startsWith("/") ? (
                      <Link href={b.href} className="hover:text-tenki-accent transition-colors">
                        {b.name}
                      </Link>
                    ) : b.href ? (
                      <a
                        href={b.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-tenki-accent transition-colors underline-offset-4 hover:underline"
                      >
                        {b.name}
                      </a>
                    ) : (
                      b.name
                    )}
                    <div className="text-xs text-tenki-muted mt-0.5 font-normal">{b.numTasks}</div>
                  </td>
                  <td className="px-4 py-3 text-tenki-muted text-xs">{b.domain}</td>
                  <td className="px-4 py-3 text-xs">{b.whatItTests}</td>
                  <td className="px-4 py-3 text-tenki-muted text-xs">{b.language}</td>
                  <td className="px-4 py-3 text-tenki-muted text-xs font-mono">{b.evalMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="h2 mb-3">Hvorfor vi henter eksempel-oppgaver fra de andre</h2>
        <p className="text-tenki-muted max-w-2xl mb-8">
          Vi kjører ikke MMLU, HumanEval eller GSM8K selv. Men hvis du
          vurderer en modell for SMB-bruk og noen sier &laquo;den scorer 91% på MMLU&raquo;,
          så hjelper det å se konkret hva slags spørsmål det faktisk er.
          Eksemplene under er hentet rått fra de offisielle HuggingFace-datasettene.
        </p>

        <section className="mb-12">
          <div className="eyebrow mb-2">MMLU — eksempler</div>
          <h3 className="h3 mb-4">Massive Multitask Language Understanding</h3>
          {mmluPick.length === 0 ? (
            <p className="text-sm text-tenki-muted">
              Ingen eksempler lastet ennå. Kjør{" "}
              <code className="rounded bg-tenki-surface px-1.5 py-0.5">npm run export:reference</code>.
            </p>
          ) : (
            <ul className="space-y-4">
              {mmluPick.map((m, i) => (
                <li key={i} className="rounded-xl border border-tenki-subtle bg-white p-4">
                  {m.subject && (
                    <div className="font-mono text-[10px] uppercase tracking-eyebrow text-tenki-muted mb-2">
                      {m.subject.replace(/_/g, " ")}
                    </div>
                  )}
                  <p className="text-sm font-medium mb-3">{m.question}</p>
                  <ol className="text-sm text-tenki-muted space-y-1 list-[upper-alpha] pl-6">
                    {m.choices.map((c, j) => (
                      <li key={j} className={j === m.answer ? "text-tenki-good font-medium" : ""}>
                        {c}
                        {j === m.answer && (
                          <span className="ml-2 text-xs font-mono uppercase tracking-eyebrow">
                            ← fasit
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-12">
          <div className="eyebrow mb-2">GSM8K — eksempler</div>
          <h3 className="h3 mb-4">Grade-School Math 8K</h3>
          {gsm8kPick.length === 0 ? (
            <p className="text-sm text-tenki-muted">
              Ingen eksempler lastet ennå. Kjør{" "}
              <code className="rounded bg-tenki-surface px-1.5 py-0.5">npm run export:reference</code>.
            </p>
          ) : (
            <ul className="space-y-4">
              {gsm8kPick.map((g, i) => (
                <li key={i} className="rounded-xl border border-tenki-subtle bg-white p-4">
                  <p className="text-sm font-medium mb-3 whitespace-pre-wrap">{g.question}</p>
                  <details>
                    <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">
                      Vis løsningstrinn {g.final_answer ? `(svar: ${g.final_answer})` : ""}
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-tenki-surface p-3 font-mono text-xs whitespace-pre-wrap">
                      {g.answer}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-12">
          <div className="eyebrow mb-2">HumanEval — eksempler</div>
          <h3 className="h3 mb-4">Python-koding fra docstring</h3>
          {humanevalPick.length === 0 ? (
            <p className="text-sm text-tenki-muted">
              Ingen eksempler lastet ennå. Kjør{" "}
              <code className="rounded bg-tenki-surface px-1.5 py-0.5">npm run export:reference</code>.
            </p>
          ) : (
            <ul className="space-y-4">
              {humanevalPick.map((h, i) => (
                <li key={i} className="rounded-xl border border-tenki-subtle bg-white p-4">
                  <div className="font-mono text-[10px] uppercase tracking-eyebrow text-tenki-muted mb-2">
                    {h.task_id} · entry: <code>{h.entry_point}</code>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-tenki-surface p-3 font-mono text-xs whitespace-pre-wrap">
                    {h.prompt}
                  </pre>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">
                      Vis kanonisk løsning
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-tenki-surface p-3 font-mono text-xs whitespace-pre-wrap">
                      {h.canonical_solution}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="rounded-xl border border-tenki-subtle bg-white p-5 mb-10">
          <div className="eyebrow mb-2">Mer detaljer</div>
          <p className="text-sm text-tenki-muted mb-3">
            Open LLM Leaderboard aggregerer flere benchmarks for åpne modeller.
            Vi henter både den aggregerte rangeringen og per-task-resultater
            (IFEval, BBH, MATH, GPQA, MUSR, MMLU-Pro) automatisk hver natt
            slik at TenkiBench-tabellen kan vise dem ved siden av våre tall.
          </p>
          <Link
            href="/metodikk"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-accent hover:underline underline-offset-4"
          >
            <span aria-hidden>←</span> Tilbake til metodikk
          </Link>
        </div>

        <p className="text-xs text-tenki-muted">
          Eksempel-oppgavene over er hentet rått fra HuggingFace-datasettene{" "}
          <code>cais/mmlu</code>, <code>openai/openai_humaneval</code> og{" "}
          <code>openai/gsm8k</code>. Alle rettigheter til disse oppgavene
          tilhører de respektive forfatterne. TenkiBench reproduserer dem her
          kun som lese-eksempler.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
