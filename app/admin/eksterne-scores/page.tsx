import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { refreshArtificialAnalysisScores } from "@/lib/external-scores/refresh";

export const dynamic = "force-dynamic";

async function refreshNow() {
  "use server";
  await refreshArtificialAnalysisScores();
  redirect("/admin/eksterne-scores?ok=1");
}

interface RefreshLog {
  id: number;
  source: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  models_updated: number;
  models_skipped: number;
  error: string | null;
}

interface ModelWithScores {
  id: number;
  slug: string;
  display_name: string;
  external_scores_updated_at: string | null;
  intelligence_index: number | null;
  mmlu_pro: number | null;
  gpqa: number | null;
  humaneval: number | null;
}

export default async function ExternalScoresAdmin({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  const { rows: logs } = await query<RefreshLog>(
    `select id, source, started_at, finished_at, status,
            models_updated, models_skipped, error
     from external_score_refreshes order by started_at desc limit 20`,
  );

  const { rows: models } = await query<ModelWithScores>(
    `select id, slug, display_name, external_scores_updated_at,
            (external_scores #>> '{artificial_analysis,intelligence_index}')::numeric as intelligence_index,
            (external_scores #>> '{artificial_analysis,scores,mmlu_pro}')::numeric as mmlu_pro,
            (external_scores #>> '{artificial_analysis,scores,gpqa_diamond}')::numeric as gpqa,
            (external_scores #>> '{artificial_analysis,scores,humaneval}')::numeric as humaneval
     from models order by display_name`,
  );

  const apiKeySet = !!process.env.ARTIFICIAL_ANALYSIS_API_KEY;

  return (
    <>
      <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted mb-3">
        Eksterne scores
      </div>
      <h1 className="font-mono font-medium text-3xl tracking-tighter mb-2">
        Artificial Analysis + andre kilder
      </h1>
      <p className="text-sm text-tenki-muted mb-8 max-w-2xl">
        Henter ekstern intelligens-rating per modell, slik at TenkiBench-score
        kan vises ved siden av MMLU-Pro, GPQA og humanEval på modell-sidene.
      </p>

      {ok && (
        <div className="mb-6 rounded-lg border border-tenki-good bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          Refresh fullført.
        </div>
      )}
      {err && (
        <div className="mb-6 rounded-lg border border-tenki-bad bg-red-50 px-4 py-2 text-sm text-red-900">
          {err}
        </div>
      )}

      {!apiKeySet && (
        <div className="mb-8 rounded-xl border border-tenki-warn bg-orange-50 p-4 max-w-2xl">
          <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-warn mb-2">
            API-nøkkel mangler
          </div>
          <p className="text-sm">
            <code>ARTIFICIAL_ANALYSIS_API_KEY</code> er ikke satt i
            <code> .env.production</code>. Hent en gratis nøkkel på{" "}
            <a className="underline" href="https://artificialanalysis.ai/documentation" target="_blank" rel="noopener">
              artificialanalysis.ai/documentation
            </a>{" "}
            (1000 req/døgn på gratis tier), legg den i env-fila, og
            recreate <code>app-bench</code>-containeren.
          </p>
        </div>
      )}

      <form action={refreshNow} className="mb-12">
        <button
          type="submit"
          disabled={!apiKeySet}
          className="inline-flex items-center justify-center bg-tenki-ink text-tenki-bg px-7 py-[14px] font-mono text-[11px] font-medium uppercase tracking-eyebrow hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Hent fra Artificial Analysis nå
        </button>
      </form>

      <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted mb-3">
        Status per modell
      </div>
      <div className="border border-tenki-subtle bg-white mb-12 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tenki-subtle text-left">
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Modell</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right">Intelligence</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right">MMLU-Pro</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right">GPQA</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right">HumanEval</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right">Hentet</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} className="border-b border-tenki-subtle last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/modeller/${m.id}`}>{m.display_name}</Link>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {m.intelligence_index ?? "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-tenki-muted">
                  {m.mmlu_pro ? `${(Number(m.mmlu_pro) * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-tenki-muted">
                  {m.gpqa ? `${(Number(m.gpqa) * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-tenki-muted">
                  {m.humaneval ? `${(Number(m.humaneval) * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-xs text-tenki-muted">
                  {formatDate(m.external_scores_updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted mb-3">
        Refresh-historikk
      </div>
      <div className="border border-tenki-subtle bg-white rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tenki-subtle text-left">
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">#</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Kilde</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Status</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right">Oppdatert</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right">Skipped</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right">Startet</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Feil</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-tenki-muted">Ingen refresh kjørt ennå</td></tr>
            ) : logs.map((l) => (
              <tr key={l.id} className="border-b border-tenki-subtle last:border-0">
                <td className="px-4 py-3 font-mono">#{l.id}</td>
                <td className="px-4 py-3 text-tenki-muted text-xs">{l.source}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={
                    l.status === "finished" ? "text-tenki-good" :
                    l.status === "failed"   ? "text-tenki-bad"  :
                    "text-tenki-muted"
                  }>{l.status}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{l.models_updated}</td>
                <td className="px-4 py-3 text-right font-mono text-tenki-muted">{l.models_skipped}</td>
                <td className="px-4 py-3 text-right text-tenki-muted text-xs">{formatDate(l.started_at)}</td>
                <td className="px-4 py-3 text-tenki-bad text-xs truncate max-w-[200px]">{l.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
