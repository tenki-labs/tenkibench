import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { query } from "@/lib/db";
import Link from "next/link";
import { formatScore, formatCost, formatDate } from "@/lib/utils";

export const revalidate = 60;

interface FullRow {
  model_id: number;
  model_slug: string;
  display_name: string;
  family: string | null;
  is_open_weights: boolean;
  total_score: string;
  run_id: number;
  finished_at: string;
  total_cost_usd: string;
}

async function getFullLeaderboard(): Promise<FullRow[]> {
  const { rows } = await query<FullRow>(`
    with latest as (
      select distinct on (r.model_id) r.id as run_id, r.model_id, r.finished_at, r.total_cost_usd
      from runs r
      where r.status = 'finished'
      order by r.model_id, r.finished_at desc
    )
    select m.id as model_id, m.slug as model_slug, m.display_name, m.family, m.is_open_weights,
           rts.total_score, latest.run_id, latest.finished_at, latest.total_cost_usd
    from latest
    join models m on m.id = latest.model_id
    join run_total_scores rts on rts.run_id = latest.run_id
    order by rts.total_score desc
  `);
  return rows;
}

export default async function LeaderboardPage() {
  let rows: FullRow[] = [];
  try {
    rows = await getFullLeaderboard();
  } catch {}

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="eyebrow mb-3">Leaderboard</div>
        <h1 className="h1 mb-2">Total-score per modell</h1>
        <p className="text-[var(--tenki-muted)] mb-10 max-w-2xl">
          Vektet gjennomsnitt over alle 8 kategorier. Vekter er publisert under{" "}
          <Link href="/metodikk" className="underline">metodikken</Link>.
        </p>

        <div className="border hairline border-[var(--tenki-subtle)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
                <th className="px-4 py-3 eyebrow">#</th>
                <th className="px-4 py-3 eyebrow">Modell</th>
                <th className="px-4 py-3 eyebrow">Familie</th>
                <th className="px-4 py-3 eyebrow">Vekter</th>
                <th className="px-4 py-3 eyebrow text-right">Score</th>
                <th className="px-4 py-3 eyebrow text-right">Kostnad</th>
                <th className="px-4 py-3 eyebrow text-right">Kjørt</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--tenki-muted)]">
                    Ingen ferdige kjøringer ennå.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr
                    key={r.model_id}
                    className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-[var(--tenki-muted)]">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/modell/${r.model_slug}`} className="font-medium">
                        {r.display_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--tenki-muted)]">{r.family ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--tenki-muted)]">
                      {r.is_open_weights ? "Åpen" : "Lukket"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatScore(r.total_score)}</td>
                    <td className="px-4 py-3 text-right text-[var(--tenki-muted)]">{formatCost(r.total_cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-[var(--tenki-muted)] text-xs">
                      {formatDate(r.finished_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
