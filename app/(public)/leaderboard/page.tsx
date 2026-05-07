import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { query } from "@/lib/db";
import Link from "next/link";
import { LeaderboardTable } from "@/components/leaderboard-table";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface FullRow {
  model_id: number;
  model_slug: string;
  display_name: string;
  family: string | null;
  is_open_weights: boolean;
  total_score: string;
  knowledge_score: string | null;
  reasoning_score: string | null;
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
           rts.total_score, rts.knowledge_score, rts.reasoning_score,
           latest.run_id, latest.finished_at, latest.total_cost_usd
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

        <LeaderboardTable rows={rows} />
      </main>
      <SiteFooter />
    </>
  );
}
