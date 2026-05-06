import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { query } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatScore, formatDate } from "@/lib/utils";
import { CategoryBarChart } from "@/components/charts/category-bar";

export const revalidate = 60;

interface CategoryRow {
  model_id: number;
  model_slug: string;
  display_name: string;
  family: string | null;
  mean_score: string;
  median_score: string;
  task_count: number;
  finished_at: string;
}

async function getCategory(slug: string) {
  const { rows } = await query<{ slug: string; name: string; description: string; weight: string }>(
    `select slug, name, description, weight from categories where slug = $1`,
    [slug],
  );
  return rows[0] ?? null;
}

async function getCategoryLeaderboard(slug: string): Promise<CategoryRow[]> {
  const { rows } = await query<CategoryRow>(
    `with latest as (
      select distinct on (r.model_id) r.id as run_id, r.model_id, r.finished_at
      from runs r
      where r.status = 'finished'
      order by r.model_id, r.finished_at desc
    )
    select m.id as model_id, m.slug as model_slug, m.display_name, m.family,
           rcs.mean_score, rcs.median_score, rcs.task_count, latest.finished_at
    from latest
    join models m on m.id = latest.model_id
    join run_category_scores rcs on rcs.run_id = latest.run_id
    where rcs.category_slug = $1 and m.is_active = true
    order by rcs.mean_score desc`,
    [slug],
  );
  return rows;
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  let leaderboard: CategoryRow[] = [];
  try {
    leaderboard = await getCategoryLeaderboard(slug);
  } catch {}

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="eyebrow mb-3">Kategori</div>
        <h1 className="h1 mb-2">{category.name}</h1>
        <p className="text-[var(--tenki-muted)] mb-2 max-w-2xl">{category.description}</p>
        <p className="text-xs text-[var(--tenki-muted)] mb-10">
          Vekt i total-score: {category.weight}
        </p>

        {leaderboard.length > 0 && (
          <div className="mb-10 border hairline border-[var(--tenki-subtle)] bg-white p-6">
            <CategoryBarChart
              data={leaderboard.map((r) => ({
                name: r.display_name,
                score: Number(r.mean_score),
              }))}
            />
          </div>
        )}

        <div className="border hairline border-[var(--tenki-subtle)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
                <th className="px-4 py-3 eyebrow">#</th>
                <th className="px-4 py-3 eyebrow">Modell</th>
                <th className="px-4 py-3 eyebrow text-right">Mean</th>
                <th className="px-4 py-3 eyebrow text-right">Median</th>
                <th className="px-4 py-3 eyebrow text-right">Oppgaver</th>
                <th className="px-4 py-3 eyebrow text-right">Kjørt</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--tenki-muted)]">
                    Ingen kjøringer i denne kategorien ennå.
                  </td>
                </tr>
              ) : (
                leaderboard.map((r, i) => (
                  <tr key={r.model_id} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                    <td className="px-4 py-3 font-mono text-[var(--tenki-muted)]">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/modell/${r.model_slug}`} className="font-medium">
                        {r.display_name}
                      </Link>
                      <span className="ml-2 text-xs text-[var(--tenki-muted)]">{r.family}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatScore(r.mean_score)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--tenki-muted)]">
                      {formatScore(r.median_score)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--tenki-muted)]">{r.task_count}</td>
                    <td className="px-4 py-3 text-right text-[var(--tenki-muted)] text-xs">
                      {formatDate(r.finished_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-sm text-[var(--tenki-muted)]">
          <Link href={`/oppgaver?kategori=${slug}`} className="underline">
            Se alle oppgaver i denne kategorien →
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
