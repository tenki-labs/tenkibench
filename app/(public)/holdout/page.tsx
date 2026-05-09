import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import manifest from "@/holdout-manifest.json";

export const metadata = {
  title: "Hold-out-set · TenkiBench",
  description:
    "20% av TenkiBench-oppgavene holdes hemmelig for å oppdage modeller som er trent på testen. Denne siden lister hash-er over hold-out-settet.",
};

interface HoldoutManifest {
  version: string;
  generated_at: string;
  total_count: number;
  by_bench: Record<string, number>;
  by_category: Record<string, number>;
  by_difficulty: Record<string, number>;
  task_hashes: string[];
}

const m = manifest as HoldoutManifest;

const DIFFICULTY_ORDER = ["easy", "medium", "hard", "expert"] as const;

export default function HoldoutPage() {
  const generated = new Date(m.generated_at).toLocaleString("no-NO", {
    timeZone: "Europe/Oslo",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const benchRows = Object.entries(m.by_bench).sort((a, b) => b[1] - a[1]);
  const difficultyRows = DIFFICULTY_ORDER.filter((d) => m.by_difficulty[d]).map(
    (d) => [d, m.by_difficulty[d]!] as const,
  );

  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 prose prose-neutral">
        <div className="eyebrow mb-3">Anti-leakage</div>
        <h1 className="h1 mb-4">Hold-out-set</h1>
        <p className="text-[var(--tenki-muted)] max-w-2xl">
          Manifest generert {generated} ·{" "}
          <span className="font-mono">v{m.version}</span>
        </p>

        <h2 className="h2 mt-10 mb-4">Hvorfor et hemmelig sett?</h2>
        <p>
          80% av TenkiBench-oppgavene er offentlige — du kan se hver enkelt prompt og
          fasit på <Link href="/oppgaver" className="underline">/oppgaver</Link>.
          De resterende 20% holdes hemmelig. Disse oppgavene kjøres kun internt og
          finnes bare på Tenki Labs sin produksjonsserver.
        </p>
        <p>
          Hensikten er enkel: hvis en modell-leverandør med vilje eller uhell
          har trent på de offentlige oppgavene, vil scoren på det offentlige
          settet være kunstig høy. Et stabilt, hemmelig hold-out-set lar oss
          oppdage slike avvik. Hvis en modell scorer betydelig lavere på
          hold-out enn på det offentlige settet, er det et signal om mulig
          test-set-kontaminasjon.
        </p>

        <h2 className="h2 mt-10 mb-4">Hva publiseres her</h2>
        <p>
          For hver hold-out-oppgave publiseres en SHA-256-hash av{" "}
          <code>id | user_prompt | gold_answer</code>. Hashen lar publikum
          verifisere at hold-out-settet er stabilt over tid (vi byttet ikke ut
          oppgaver mellom kjøringer) — uten å avsløre selve oppgaven.
          Hashene sorteres alfabetisk for at manifestet skal være
          deterministisk.
        </p>

        <h2 className="h2 mt-10 mb-4">Statistikk</h2>
        <p>
          <strong>Total: {m.total_count} oppgaver.</strong>
        </p>

        {m.total_count > 0 && (
          <>
            <h3 className="mt-8 mb-3 font-mono text-xs uppercase tracking-eyebrow text-[var(--tenki-muted)]">
              Per bench
            </h3>
            <table className="w-full border-collapse text-sm not-prose">
              <thead>
                <tr className="border-b border-[var(--tenki-subtle)]">
                  <th className="text-left py-2 font-mono text-xs uppercase tracking-eyebrow text-[var(--tenki-muted)]">
                    Bench
                  </th>
                  <th className="text-right py-2 font-mono text-xs uppercase tracking-eyebrow text-[var(--tenki-muted)]">
                    Antall
                  </th>
                </tr>
              </thead>
              <tbody>
                {benchRows.map(([bench, count]) => (
                  <tr
                    key={bench}
                    className="border-b border-[var(--tenki-subtle)]"
                  >
                    <td className="py-2 font-mono">{bench}</td>
                    <td className="py-2 text-right tabular-nums">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="mt-8 mb-3 font-mono text-xs uppercase tracking-eyebrow text-[var(--tenki-muted)]">
              Per vanskelighetsgrad
            </h3>
            <table className="w-full border-collapse text-sm not-prose">
              <thead>
                <tr className="border-b border-[var(--tenki-subtle)]">
                  <th className="text-left py-2 font-mono text-xs uppercase tracking-eyebrow text-[var(--tenki-muted)]">
                    Nivå
                  </th>
                  <th className="text-right py-2 font-mono text-xs uppercase tracking-eyebrow text-[var(--tenki-muted)]">
                    Antall
                  </th>
                </tr>
              </thead>
              <tbody>
                {difficultyRows.map(([d, count]) => (
                  <tr key={d} className="border-b border-[var(--tenki-subtle)]">
                    <td className="py-2 font-mono">{d}</td>
                    <td className="py-2 text-right tabular-nums">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {m.total_count === 0 && (
          <p className="text-[var(--tenki-muted)]">
            Hold-out-settet er ikke generert i dette miljøet ennå. Manifestet
            populeres så snart hemmelige oppgaver er lagt inn på serveren.
          </p>
        )}

        <h2 className="h2 mt-10 mb-4">Mer om metodikk</h2>
        <p>
          Detaljer om scoring, eval-metoder og kategorivekter finner du i{" "}
          <Link href="/metodikk" className="underline">/metodikk</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
