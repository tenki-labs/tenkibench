import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  refreshArtificialAnalysis,
  refreshLmArena,
  refreshOpenLlmLeaderboard,
  refreshOpenLlmResults,
  refreshAll,
} from "@/lib/external-scores/refresh";
import {
  isAutoRefreshEnabled,
  setSetting,
} from "@/lib/system-settings";
import { requireStaff } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

async function runAA() {
  "use server";
  try { await refreshArtificialAnalysis(); redirect("/admin/eksterne-scores?ok=aa"); }
  catch (e) { redirect(`/admin/eksterne-scores?err=${encodeURIComponent((e as Error).message.slice(0, 200))}`); }
}
async function runLmArena() {
  "use server";
  try { await refreshLmArena(); redirect("/admin/eksterne-scores?ok=lmarena"); }
  catch (e) { redirect(`/admin/eksterne-scores?err=${encodeURIComponent((e as Error).message.slice(0, 200))}`); }
}
async function runOpenLlm() {
  "use server";
  try { await refreshOpenLlmLeaderboard(); redirect("/admin/eksterne-scores?ok=open_llm"); }
  catch (e) { redirect(`/admin/eksterne-scores?err=${encodeURIComponent((e as Error).message.slice(0, 200))}`); }
}
async function runOpenLlmResults() {
  "use server";
  try { await refreshOpenLlmResults(); redirect("/admin/eksterne-scores?ok=open_llm_results"); }
  catch (e) { redirect(`/admin/eksterne-scores?err=${encodeURIComponent((e as Error).message.slice(0, 200))}`); }
}
async function runAllSources() {
  "use server";
  try { await refreshAll(); redirect("/admin/eksterne-scores?ok=all"); }
  catch (e) { redirect(`/admin/eksterne-scores?err=${encodeURIComponent((e as Error).message.slice(0, 200))}`); }
}

async function toggleAutoRefresh() {
  "use server";
  let nextStateOn = false;
  try {
    const claims = await requireStaff();
    const current = await isAutoRefreshEnabled();
    nextStateOn = !current;
    const updatedBy = claims.email ?? "ukjent";
    await setSetting(
      "external_scores_auto_refresh_enabled",
      nextStateOn,
      updatedBy,
    );
  } catch (e) {
    redirect(`/admin/eksterne-scores?err=${encodeURIComponent((e as Error).message.slice(0, 200))}`);
  }
  redirect(`/admin/eksterne-scores?ok=toggle_${nextStateOn ? "on" : "off"}`);
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

  const { rows: autoLogs } = await query<RefreshLog>(
    `select id, source, started_at, finished_at, status,
            models_updated, models_skipped, error
     from external_score_refreshes
     where source = 'cron_auto'
     order by started_at desc
     limit 5`,
  );

  const autoEnabled = await isAutoRefreshEnabled();

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

      <div className="mb-8 rounded-xl border border-tenki-subtle bg-white p-4 max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted mb-1">
              Auto-refresh (24-timers cron)
            </div>
            <div className="font-sans text-sm font-medium mb-1">
              {autoEnabled ? "Påslått" : "Avslått"}
            </div>
            <p className="text-xs text-tenki-muted max-w-md">
              Når påslått: cron-jobben kjører <code>refreshAll()</code> hver
              natt. Når avslått: cron-kall uten <code>?source</code> hopper over
              og logger en <code>skipped</code>-rad. Manuelle knapper under
              fungerer uansett.
            </p>
          </div>
          <form action={toggleAutoRefresh}>
            <button
              type="submit"
              className={
                autoEnabled
                  ? "rounded-xl border border-tenki-subtle bg-white px-4 py-2 text-sm font-medium hover:bg-tenki-surface transition-colors"
                  : "rounded-xl bg-tenki-ink text-tenki-bg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              }
            >
              {autoEnabled ? "Skru av" : "Skru på"}
            </button>
          </form>
        </div>

        {autoLogs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-tenki-subtle">
            <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted mb-2">
              Siste 5 auto-kjøringer
            </div>
            <ul className="space-y-1 text-xs">
              {autoLogs.map((l) => (
                <li key={l.id} className="flex justify-between gap-3 font-mono">
                  <span className="text-tenki-muted">{formatDate(l.started_at)}</span>
                  <span className={
                    l.status === "finished" ? "text-tenki-good" :
                    l.status === "failed"   ? "text-tenki-bad"  :
                    "text-tenki-muted"
                  }>
                    {l.status}
                    {l.status === "skipped" && l.error ? ` (${l.error})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

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

      <div className="mb-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <form action={runAA}>
          <button
            type="submit"
            disabled={!apiKeySet}
            className="w-full rounded-xl border border-tenki-subtle bg-white p-4 text-left card-lift disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-accent mb-1">
              Artificial Analysis
            </div>
            <div className="font-sans text-sm font-medium">
              GPT, Claude, Gemini, Mistral, ...
            </div>
            <div className="text-xs text-tenki-muted mt-2">
              {apiKeySet ? "Krever API-nøkkel ✓" : "API-nøkkel mangler"}
            </div>
          </button>
        </form>
        <form action={runLmArena}>
          <button
            type="submit"
            className="w-full rounded-xl border border-tenki-subtle bg-white p-4 text-left card-lift"
          >
            <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-accent mb-1">
              LMArena (Chatbot Arena)
            </div>
            <div className="font-sans text-sm font-medium">
              Elo-rating fra mennesker
            </div>
            <div className="text-xs text-tenki-muted mt-2">
              Via HuggingFace · Ingen nøkkel
            </div>
          </button>
        </form>
        <form action={runOpenLlm}>
          <button
            type="submit"
            className="w-full rounded-xl border border-tenki-subtle bg-white p-4 text-left card-lift"
          >
            <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-accent mb-1">
              Open LLM Leaderboard
            </div>
            <div className="font-sans text-sm font-medium">
              Llama, Qwen, DeepSeek, Mistral
            </div>
            <div className="text-xs text-tenki-muted mt-2">
              Via HuggingFace · Ingen nøkkel · Kun åpne vekter
            </div>
          </button>
        </form>
        <form action={runOpenLlmResults}>
          <button
            type="submit"
            className="w-full rounded-xl border border-tenki-subtle bg-white p-4 text-left card-lift"
          >
            <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-accent mb-1">
              Open LLM Results (detailed)
            </div>
            <div className="font-sans text-sm font-medium">
              Per-task scores (IFEval, BBH, MATH, GPQA, MUSR, MMLU-Pro)
            </div>
            <div className="text-xs text-tenki-muted mt-2">
              Via HuggingFace · Ingen nøkkel · Granulær per-oppgave
            </div>
          </button>
        </form>
        <form action={runAllSources}>
          <button
            type="submit"
            className="w-full rounded-xl bg-tenki-ink text-tenki-bg p-4 text-left hover:opacity-90 transition-opacity"
          >
            <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-accent mb-1">
              Alle kilder
            </div>
            <div className="font-sans text-sm font-medium">
              Refresh hele settet
            </div>
            <div className="text-xs text-tenki-muted mt-2">
              ~2 min
            </div>
          </button>
        </form>
      </div>

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

      <details className="mt-8 max-w-2xl rounded-xl border border-tenki-subtle bg-white p-4">
        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">
          Slik konfigurerer du cron
        </summary>
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-tenki-muted">
            Legg denne linja i crontab på serveren — den kjører hver natt
            kl. 04:00 og treffer ruta uten <code>?source</code>, slik at
            kill-switchen over kan skru den av/på.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-tenki-surface p-3 font-mono text-xs">
{`0 4 * * *  curl -fsS -H "Authorization: Bearer $CRON_TOKEN" https://bench.tenki.no/api/cron/refresh-external-scores`}
          </pre>
          <p className="text-xs text-tenki-muted">
            <code>$CRON_TOKEN</code> må eksporteres i shell-en som eier
            crontab-en (f.eks. via <code>/etc/cron.d/tenkibench</code> eller
            en wrapper som leser <code>.env.production</code>).
          </p>
        </div>
      </details>
    </>
  );
}
