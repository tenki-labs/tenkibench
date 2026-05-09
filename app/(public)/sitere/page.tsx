import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";

export const metadata = { title: "Sitere TenkiBench · TenkiBench" };

// Render the citation page on each request so the UTC timestamp matches
// "the leaderboard at this date" pattern users expect when citing.
export const dynamic = "force-dynamic";

const BENCH_VERSION = "v0.6";

const BIBTEX = `@misc{tenkibench2026,
  title={TenkiBench: A Norwegian SMB Benchmark for Language Models},
  author={Holt, Einar and contributors},
  year={2026},
  url={https://bench.tenki.no},
  version={v0.6},
  note={CC-BY 4.0}
}`;

const APA = `Holt, E., & contributors. (2026). TenkiBench: A Norwegian SMB Benchmark for Language Models (Version v0.6) [Data set]. https://bench.tenki.no`;

const MLA = `Holt, Einar, and contributors. "TenkiBench: A Norwegian SMB Benchmark for Language Models." Version v0.6, Tenki Labs AS, 2026, bench.tenki.no.`;

const MODEL_BIBTEX = `@misc{tenkibench-claude-opus-47-2026,
  title={TenkiBench score for Claude Opus 4.7},
  author={Holt, Einar and contributors},
  year={2026},
  howpublished={\\url{https://bench.tenki.no/modell/claude-opus-4-7}},
  note={TenkiBench v0.6, snapshot ${new Date().toISOString().slice(0, 10)}}
}`;

export default function SiterePage() {
  const now = new Date();
  const utcStamp = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  const dateOnly = now.toISOString().slice(0, 10);
  const snapshotApa =
    `Holt, E., & contributors. (2026). TenkiBench leaderboard [Data snapshot, ${utcStamp}, version ${BENCH_VERSION}]. https://bench.tenki.no/leaderboard`;

  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16">
        <div className="eyebrow mb-3">Sitering</div>
        <h1 className="h1 mb-4">Sitere TenkiBench</h1>
        <p className="text-lg leading-relaxed text-[var(--tenki-muted)] mb-10">
          Bruk TenkiBench i forskning, blogginnlegg, anbudsdokumenter eller intern
          modell-evaluering. Lisensen er <strong>CC-BY 4.0</strong> — du kan bruke det fritt,
          så lenge du krediterer.
        </p>

        <Section eyebrow="01" title="BibTeX">
          <p className="text-[var(--tenki-muted)] mb-4">
            For akademiske publikasjoner og tekniske rapporter.
          </p>
          <CodeBlock>{BIBTEX}</CodeBlock>
        </Section>

        <Section eyebrow="02" title="APA (7. utgave)">
          <CodeBlock>{APA}</CodeBlock>
        </Section>

        <Section eyebrow="03" title="MLA (9. utgave)">
          <CodeBlock>{MLA}</CodeBlock>
        </Section>

        <Section eyebrow="04" title="Sitering for spesifikk modell">
          <p className="text-[var(--tenki-muted)] mb-4">
            Når du siterer en bestemt modells score (f.eks. i en sammenligning), bruk
            modell-URL-en og noter snapshot-datoen — leaderboardet oppdateres jevnlig.
          </p>
          <CodeBlock>{MODEL_BIBTEX}</CodeBlock>
        </Section>

        <Section eyebrow="05" title="Sitering av leaderboardet på et gitt tidspunkt">
          <p className="text-[var(--tenki-muted)] mb-4">
            Leaderboardet oppdateres når nye modeller er evaluert. Hvis du siterer et
            spesifikt øyeblikk, ta med UTC-tidsstempel.
          </p>
          <div className="rounded-xl border border-[var(--tenki-subtle)] bg-[var(--tenki-surface)] px-4 py-3 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-eyebrow text-[var(--tenki-muted)] mb-1">
              UTC-stempel nå
            </div>
            <code className="font-mono text-sm">{utcStamp}</code>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-[var(--tenki-muted)] mb-2">
            APA-format
          </p>
          <CodeBlock>{snapshotApa}</CodeBlock>
        </Section>

        <Section eyebrow="06" title="Last ned hele datasettet">
          <p className="text-[var(--tenki-muted)] mb-4">
            Alle ikke-holdout-oppgaver er offentlige. Tre formater:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-[var(--tenki-muted)]">
            <li>
              <Link
                href="/api/public/dataset?format=json"
                className="underline text-[var(--tenki-ink)] hover:text-tenki-accent"
              >
                JSON
              </Link>
              {" "}— full struktur, inkludert prompts og fasit
            </li>
            <li>
              <Link
                href="/api/public/dataset?format=jsonl"
                className="underline text-[var(--tenki-ink)] hover:text-tenki-accent"
              >
                JSONL
              </Link>
              {" "}— én oppgave per linje, for streaming og dataverktøy
            </li>
            <li>
              <Link
                href="/api/public/dataset?format=csv"
                className="underline text-[var(--tenki-ink)] hover:text-tenki-accent"
              >
                CSV
              </Link>
              {" "}— oversikts-kolonner: id, bench, kategori, tittel, vanskelighet
            </li>
          </ul>
          <p className="text-[var(--tenki-muted)]">
            Leaderboardet i samme formater:{" "}
            <Link href="/api/public/leaderboard?format=json" className="underline text-[var(--tenki-ink)] hover:text-tenki-accent">JSON</Link>
            {" · "}
            <Link href="/api/public/leaderboard?format=jsonl" className="underline text-[var(--tenki-ink)] hover:text-tenki-accent">JSONL</Link>
            {" · "}
            <Link href="/api/public/leaderboard?format=csv" className="underline text-[var(--tenki-ink)] hover:text-tenki-accent">CSV</Link>.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-[var(--tenki-muted)] mt-4">
            Snapshot · {dateOnly}
          </p>
        </Section>

        <Section eyebrow="07" title="Lisens">
          <ul className="list-disc pl-6 space-y-2 text-[var(--tenki-muted)]">
            <li>
              <strong className="text-[var(--tenki-ink)]">Oppgaver, prompts, fasit, eval-resultater:</strong>{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                className="underline text-[var(--tenki-ink)] hover:text-tenki-accent"
              >
                CC-BY 4.0
              </a>
              {" "}— fri bruk, krever sitering.
            </li>
            <li>
              <strong className="text-[var(--tenki-ink)]">Kildekode:</strong>{" "}
              <a
                href="https://opensource.org/license/mit"
                className="underline text-[var(--tenki-ink)] hover:text-tenki-accent"
              >
                MIT
              </a>
              {" "}— se{" "}
              <a
                href="https://github.com/tenki-labs/tenkibench"
                className="underline text-[var(--tenki-ink)] hover:text-tenki-accent"
              >
                GitHub
              </a>
              .
            </li>
            <li>
              <strong className="text-[var(--tenki-ink)]">Modeller som evalueres:</strong>{" "}
              vi distribuerer ingen modell-vekter. Modellene tilhører sine respektive eiere
              (OpenAI, Anthropic, Mistral, Meta, Alibaba, …) og er underlagt deres lisenser.
              TenkiBench rapporterer kun målte score.
            </li>
            <li>
              <strong className="text-[var(--tenki-ink)]">Hold-out-set:</strong>{" "}
              ikke offentlig. Brukes til å oppdage modeller trent på testen.
            </li>
          </ul>
        </Section>

        <Section eyebrow="08" title="Spørsmål om sitering">
          <p className="text-[var(--tenki-muted)]">
            Trenger du en spesifikk DOI, en tidsstemplet snapshot for en publikasjon,
            eller hjelp med å sitere TenkiBench i en anbudsbesvarelse? Skriv til{" "}
            <a href="mailto:einar@tenki.no" className="underline text-[var(--tenki-ink)] hover:text-tenki-accent">
              einar@tenki.no
            </a>
            .
          </p>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="font-mono text-[10px] uppercase tracking-eyebrow text-[var(--tenki-muted)]">
          {eyebrow}
        </span>
        <h2 className="h2">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-xl border border-[var(--tenki-subtle)] bg-[var(--tenki-surface)] px-4 py-3 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}
