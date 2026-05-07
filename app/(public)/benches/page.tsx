import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/card";
import { query } from "@/lib/db";
import { loadAllTasks } from "@/lib/tasks/loader";
import { BenchesGrid } from "@/components/benches-grid";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function BenchesIndex() {
  const all = loadAllTasks();
  const taskCounts = all.reduce<Record<string, number>>((acc, t) => {
    acc[t.bench] = (acc[t.bench] ?? 0) + 1;
    return acc;
  }, {});

  let rows: Array<{ slug: string; name: string; description: string; category_count: number; task_count: number }> = [];
  try {
    const { rows: dbRows } = await query<{
      slug: string; name: string; description: string; category_count: number;
    }>(
      `select b.slug, b.name, b.description,
              (select count(*) from categories c where c.bench_slug = b.slug)::int as category_count
       from benches b
       order by case when b.slug = 'norwegian-smb' then 0 else 1 end, b.name`,
    );
    rows = dbRows.map((r) => ({ ...r, task_count: taskCounts[r.slug] ?? 0 }));
  } catch {}

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="eyebrow mb-3">Benches</div>
        <h1 className="h1 mb-2">Hele katalogen</h1>
        <p className="text-[var(--tenki-muted)] mb-10 max-w-2xl">
          {rows.length} benches i katalog. Norsk SMB er live; resten ruller ut Q3 2026 → 2028.
        </p>

        <BenchesGrid benches={rows} />
      </main>
      <SiteFooter />
    </>
  );
}
