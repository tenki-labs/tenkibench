import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { query } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatScore, formatCost, formatDate, formatNumber } from "@/lib/utils";
import { ModelRadarChart } from "@/components/charts/radar-chart";
import { TimeseriesChart } from "@/components/charts/timeseries";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function ModelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { rows: models } = await query<{
    id: number; slug: string; display_name: string; provider: string;
    family: string | null; parameter_count: string | null; is_open_weights: boolean;
    notes: string | null;
  }>(`select id, slug, display_name, provider, family, parameter_count, is_open_weights, notes
       from models where slug = $1`, [slug]);
  const model = models[0];
  if (!model) notFound();

  const { rows: latestRun } = await query<{
    run_id: number; finished_at: string; total_score: string;
    total_cost_usd: string; total_tokens_in: string; total_tokens_out: string;
  }>(`select r.id as run_id, r.finished_at, rts.total_score,
              r.total_cost_usd, r.total_tokens_in, r.total_tokens_out
       from runs r
       join run_total_scores rts on rts.run_id = r.id
       where r.model_id = $1 and r.status = 'finished'
       order by r.finished_at desc limit 1`, [model.id]);

  const { rows: categoryScores } = await query<{
    category_slug: string; category_name: string; mean_score: string;
  }>(`select rcs.category_slug, c.name as category_name, rcs.mean_score
       from run_category_scores rcs
       join categories c on c.slug = rcs.category_slug
       where rcs.run_id = $1
       order by c.weight desc`, [latestRun[0]?.run_id ?? -1]);

  const { rows: history } = await query<{
    finished_at: string; total_score: string;
  }>(`select r.finished_at, rts.total_score
       from runs r join run_total_scores rts on rts.run_id = r.id
       where r.model_id = $1 and r.status = 'finished'
       order by r.finished_at asc`, [model.id]);

  const radarData = categoryScores.map((c) => ({
    category: c.category_name,
    score: Number(c.mean_score),
  }));

  const tsData = history.map((h) => ({
    date: new Date(h.finished_at).toISOString().slice(0, 10),
    [model.slug]: Number(h.total_score),
  }));

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="eyebrow mb-3">{model.provider} · {model.family ?? "—"}</div>
        <h1 className="h1 mb-2">{model.display_name}</h1>
        <p className="text-sm text-[var(--tenki-muted)] mb-10">
          {model.parameter_count ? `${formatNumber(model.parameter_count)} parametere · ` : ""}
          {model.is_open_weights ? "åpne vekter" : "lukkede vekter"}
          {model.notes ? ` · ${model.notes}` : ""}
        </p>

        {latestRun[0] ? (
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <div className="border hairline border-[var(--tenki-subtle)] bg-white p-6">
              <div className="eyebrow mb-1">Total-score</div>
              <div className="font-mono text-2xl">{formatScore(latestRun[0].total_score)}</div>
            </div>
            <div className="border hairline border-[var(--tenki-subtle)] bg-white p-6">
              <div className="eyebrow mb-1">Sist kjørt</div>
              <div className="font-mono text-lg">{formatDate(latestRun[0].finished_at)}</div>
            </div>
            <div className="border hairline border-[var(--tenki-subtle)] bg-white p-6">
              <div className="eyebrow mb-1">Kostnad denne kjøringen</div>
              <div className="font-mono text-lg">{formatCost(latestRun[0].total_cost_usd)}</div>
            </div>
          </div>
        ) : (
          <p className="text-[var(--tenki-muted)] mb-10">Ingen kjøringer for denne modellen ennå.</p>
        )}

        {radarData.length > 0 && (
          <div className="mb-10 border hairline border-[var(--tenki-subtle)] bg-white p-6">
            <div className="eyebrow mb-2">Score per kategori (nyeste kjøring)</div>
            <ModelRadarChart data={radarData} modelName={model.display_name} />
          </div>
        )}

        {tsData.length > 1 && (
          <div className="mb-10 border hairline border-[var(--tenki-subtle)] bg-white p-6">
            <div className="eyebrow mb-2">Total-score over tid</div>
            <TimeseriesChart data={tsData} modelKeys={[model.slug]} />
          </div>
        )}

        <div className="mb-10">
          <div className="eyebrow mb-2">Per kategori</div>
          <div className="border hairline border-[var(--tenki-subtle)] bg-white">
            <table className="w-full text-sm">
              <tbody>
                {categoryScores.map((c) => (
                  <tr key={c.category_slug} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/kategorier/${c.category_slug}`}>{c.category_name}</Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatScore(c.mean_score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
