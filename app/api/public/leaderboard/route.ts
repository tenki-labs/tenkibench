import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 60;

/**
 * Public leaderboard API. Used by third parties to cite scores.
 * No auth, no rate-limit yet (Caddy can add).
 */
export async function GET() {
  const { rows } = await query(`
    with latest as (
      select distinct on (r.model_id) r.id as run_id, r.model_id, r.finished_at,
                                       r.bench_version, r.prompt_version
      from runs r
      where r.status = 'finished'
      order by r.model_id, r.finished_at desc
    )
    select
      m.slug as model,
      m.display_name as name,
      m.provider,
      m.family,
      m.is_open_weights as open_weights,
      rts.total_score,
      latest.bench_version,
      latest.prompt_version,
      latest.finished_at,
      coalesce(json_object_agg(rcs.category_slug, rcs.mean_score)
               filter (where rcs.category_slug is not null), '{}'::json) as categories
    from latest
    join models m on m.id = latest.model_id
    join run_total_scores rts on rts.run_id = latest.run_id
    left join run_category_scores rcs on rcs.run_id = latest.run_id
    where m.is_active = true
    group by m.slug, m.display_name, m.provider, m.family, m.is_open_weights,
             rts.total_score, latest.bench_version, latest.prompt_version, latest.finished_at
    order by rts.total_score desc
  `);

  return NextResponse.json({
    bench: "TenkiBench",
    version: "0.1",
    methodology: "https://bench.tenki.no/metodikk",
    license: "CC BY 4.0 (cite tenki.no)",
    generated_at: new Date().toISOString(),
    leaderboard: rows,
  });
}
