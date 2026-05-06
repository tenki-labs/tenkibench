import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { query } from "@/lib/db";
import Link from "next/link";
import { formatScore, formatCost, formatDate } from "@/lib/utils";
import { CompareRadarChart } from "@/components/charts/compare-radar";

export const dynamic = "force-dynamic";

interface ModelOption {
  slug: string;
  display_name: string;
}

interface CompareRow {
  model_slug: string;
  display_name: string;
  family: string | null;
  total_score: string;
  total_cost_usd: string;
  finished_at: string;
  per_category: Record<string, number>;
}

async function getModels(): Promise<ModelOption[]> {
  const { rows } = await query<ModelOption>(
    `select slug, display_name from models where is_active = true order by display_name`,
  );
  return rows;
}

async function getCompare(slugs: string[]): Promise<CompareRow[]> {
  if (slugs.length === 0) return [];
  const { rows } = await query<{
    model_slug: string; display_name: string; family: string | null;
    total_score: string; total_cost_usd: string; finished_at: string;
    category_slug: string; mean_score: string;
  }>(
    `with latest as (
       select distinct on (r.model_id) r.id as run_id, r.model_id, r.finished_at, r.total_cost_usd
       from runs r
       where r.status = 'finished'
       order by r.model_id, r.finished_at desc
     )
     select m.slug as model_slug, m.display_name, m.family,
            rts.total_score, latest.total_cost_usd, latest.finished_at,
            rcs.category_slug, rcs.mean_score
     from latest
     join models m on m.id = latest.model_id
     join run_total_scores rts on rts.run_id = latest.run_id
     left join run_category_scores rcs on rcs.run_id = latest.run_id
     where m.slug = ANY($1::text[])`,
    [slugs],
  );

  const map = new Map<string, CompareRow>();
  for (const r of rows) {
    if (!map.has(r.model_slug)) {
      map.set(r.model_slug, {
        model_slug: r.model_slug,
        display_name: r.display_name,
        family: r.family,
        total_score: r.total_score,
        total_cost_usd: r.total_cost_usd,
        finished_at: r.finished_at,
        per_category: {},
      });
    }
    if (r.category_slug) {
      map.get(r.model_slug)!.per_category[r.category_slug] = Number(r.mean_score);
    }
  }
  return Array.from(map.values());
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; c?: string; d?: string }>;
}) {
  const params = await searchParams;
  const slugs = [params.a, params.b, params.c, params.d].filter(
    (s): s is string => Boolean(s),
  );

  const models = await getModels();
  const compare = await getCompare(slugs);

  const allCategories = Array.from(
    new Set(compare.flatMap((r) => Object.keys(r.per_category))),
  ).sort();

  const radarData = allCategories.map((cat) => {
    const row: Record<string, string | number> = { category: cat };
    for (const r of compare) row[r.display_name] = r.per_category[cat] ?? 0;
    return row;
  });

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="eyebrow mb-3">Sammenlign</div>
        <h1 className="h1 mb-2">Modell mot modell</h1>
        <p className="text-[var(--tenki-muted)] mb-10 max-w-2xl">
          Velg opp til 4 modeller for å se hvordan de skiller seg per kategori.
        </p>

        <form className="grid sm:grid-cols-4 gap-3 mb-10">
          {(["a", "b", "c", "d"] as const).map((k, i) => (
            <div key={k}>
              <label className="eyebrow block mb-1">Modell {i + 1}</label>
              <select
                name={k}
                defaultValue={params[k] ?? ""}
                className="w-full border hairline border-[var(--tenki-subtle)] px-3 py-2 bg-white text-sm"
              >
                <option value="">—</option>
                {models.map((m) => (
                  <option key={m.slug} value={m.slug}>{m.display_name}</option>
                ))}
              </select>
            </div>
          ))}
          <div className="sm:col-span-4">
            <button type="submit" className="border hairline border-[var(--tenki-ink)] px-4 py-2 text-sm">
              Sammenlign
            </button>
          </div>
        </form>

        {compare.length === 0 ? (
          <p className="text-[var(--tenki-muted)]">Velg modeller over for å starte.</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {compare.map((r) => (
                <div key={r.model_slug} className="border hairline border-[var(--tenki-subtle)] bg-white p-6">
                  <div className="eyebrow mb-1">{r.family ?? "—"}</div>
                  <div className="font-medium">{r.display_name}</div>
                  <div className="font-mono text-2xl mt-2">{formatScore(r.total_score)}</div>
                  <div className="text-xs text-[var(--tenki-muted)] mt-2">
                    {formatCost(r.total_cost_usd)} · {formatDate(r.finished_at)}
                  </div>
                </div>
              ))}
            </div>

            {radarData.length > 0 && (
              <div className="mb-10 border hairline border-[var(--tenki-subtle)] bg-white p-6">
                <div className="eyebrow mb-2">Radar — score per kategori</div>
                <CompareRadarChart
                  data={radarData}
                  modelNames={compare.map((r) => r.display_name)}
                />
              </div>
            )}

            <div className="border hairline border-[var(--tenki-subtle)] bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
                    <th className="px-4 py-3 eyebrow">Kategori</th>
                    {compare.map((r) => (
                      <th key={r.model_slug} className="px-4 py-3 eyebrow text-right">{r.display_name}</th>
                    ))}
                    {compare.length === 2 && <th className="px-4 py-3 eyebrow text-right">Δ</th>}
                  </tr>
                </thead>
                <tbody>
                  {allCategories.map((cat) => {
                    const scores = compare.map((r) => r.per_category[cat] ?? 0);
                    const max = Math.max(...scores);
                    return (
                      <tr key={cat} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/kategorier/${cat}`}>{cat}</Link>
                        </td>
                        {compare.map((r, i) => (
                          <td
                            key={r.model_slug}
                            className={`px-4 py-3 text-right font-mono ${
                              scores[i] === max && scores[i] > 0 ? "text-emerald-700 font-medium" : ""
                            }`}
                          >
                            {formatScore(r.per_category[cat] ?? 0)}
                          </td>
                        ))}
                        {compare.length === 2 && (
                          <td className="px-4 py-3 text-right font-mono text-xs">
                            {(() => {
                              const d = scores[0] - scores[1];
                              const sign = d > 0 ? "+" : "";
                              return `${sign}${(d * 100).toFixed(1)}pp`;
                            })()}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
