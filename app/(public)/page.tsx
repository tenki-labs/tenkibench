import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/card";
import { query } from "@/lib/db";
import { formatScore, formatDate } from "@/lib/utils";

export const revalidate = 60;

interface LeaderRow {
  model_id: number;
  model_slug: string;
  display_name: string;
  family: string | null;
  is_open_weights: boolean;
  total_score: string;
  run_id: number;
  finished_at: string;
}

async function getTopLeaderboard(): Promise<LeaderRow[]> {
  const { rows } = await query<LeaderRow>(`
    with latest as (
      select distinct on (r.model_id) r.id as run_id, r.model_id, r.finished_at
      from runs r
      where r.status = 'finished'
      order by r.model_id, r.finished_at desc
    )
    select m.id as model_id, m.slug as model_slug, m.display_name, m.family, m.is_open_weights,
           rts.total_score, latest.run_id, latest.finished_at
    from latest
    join models m on m.id = latest.model_id
    join run_total_scores rts on rts.run_id = latest.run_id
    where m.is_active = true
    order by rts.total_score desc
    limit 20
  `);
  return rows;
}

export default async function HomePage() {
  let leaderboard: LeaderRow[] = [];
  try {
    leaderboard = await getTopLeaderboard();
  } catch {
    // db not yet migrated / empty
  }

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <section className="mb-16 max-w-3xl">
          <div className="eyebrow mb-3">TenkiBench v0.1</div>
          <h1 className="h1 mb-6">
            Hvor god er språkmodellen din på norske SMB-oppgaver?
          </h1>
          <p className="text-lg text-[var(--tenki-muted)] leading-relaxed">
            Åpen test av faktura-tolkning, kontrakts-analyse, MVA, lov-referanse, Brønnøysund-data,
            HR/lønn, kundeservice og Bokmål↔Nynorsk. Alle oppgavene, evalueringen og resultatene er
            offentlig. Vi tar aldri penger fra modell-leverandører for å bli evaluert.
          </p>
          <div className="mt-8 flex gap-4 text-sm">
            <Link href="/leaderboard" className="border hairline border-[var(--tenki-ink)] px-4 py-2">
              Se leaderboard →
            </Link>
            <Link href="/metodikk" className="px-4 py-2">
              Les metodikken →
            </Link>
          </div>
        </section>

        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <div className="eyebrow">Topp-20 leaderboard</div>
              <h2 className="h2 mt-1">Total-score, vektet per kategori</h2>
            </div>
            <Link href="/leaderboard" className="text-sm">Full liste →</Link>
          </div>
          {leaderboard.length === 0 ? (
            <Card>
              <CardEyebrow>Ingen kjøringer ennå</CardEyebrow>
              <CardTitle>Benchmark er under oppstart.</CardTitle>
              <p className="text-[var(--tenki-muted)] mt-2">
                Database er tom eller ikke migrert. Kjør første benchmark fra <code>/admin</code>.
              </p>
            </Card>
          ) : (
            <div className="border hairline border-[var(--tenki-subtle)] bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
                    <th className="px-4 py-3 eyebrow">#</th>
                    <th className="px-4 py-3 eyebrow">Modell</th>
                    <th className="px-4 py-3 eyebrow">Familie</th>
                    <th className="px-4 py-3 eyebrow">Vekter</th>
                    <th className="px-4 py-3 eyebrow text-right">Score</th>
                    <th className="px-4 py-3 eyebrow text-right">Sist kjørt</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr
                      key={row.model_id}
                      className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-[var(--tenki-muted)]">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/modell/${row.model_slug}`} className="font-medium">
                          {row.display_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--tenki-muted)]">{row.family ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--tenki-muted)]">
                        {row.is_open_weights ? "Åpen" : "Lukket"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatScore(row.total_score)}</td>
                      <td className="px-4 py-3 text-right text-[var(--tenki-muted)] text-xs">
                        {formatDate(row.finished_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {[
            { eyebrow: "01", title: "Faktura", href: "/kategorier/faktura" },
            { eyebrow: "02", title: "Kontrakt", href: "/kategorier/kontrakt" },
            { eyebrow: "03", title: "MVA og skatt", href: "/kategorier/mva-skatt" },
            { eyebrow: "04", title: "Lov-referanse", href: "/kategorier/lov-referanse" },
            { eyebrow: "05", title: "Brønnøysund", href: "/kategorier/brreg" },
            { eyebrow: "06", title: "HR og lønn", href: "/kategorier/hr-lonn" },
            { eyebrow: "07", title: "Kundeservice", href: "/kategorier/kundeservice" },
            { eyebrow: "08", title: "Bokmål↔Nynorsk", href: "/kategorier/bokmal-nynorsk" },
          ].map((cat) => (
            <Link key={cat.href} href={cat.href}>
              <Card className="hover:accent-strip transition-shadow">
                <CardEyebrow>{cat.eyebrow}</CardEyebrow>
                <CardTitle>{cat.title}</CardTitle>
              </Card>
            </Link>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
