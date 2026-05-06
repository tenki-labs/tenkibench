import { query } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatScore, formatCost, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 3;

export default async function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const runId = Number(id);

  const { rows } = await query<{
    id: number; status: string; display_name: string; model_slug: string;
    started_at: string; finished_at: string | null;
    task_count: number; completed_count: number; failed_count: number;
    total_cost_usd: string; total_tokens_in: string; total_tokens_out: string;
    total_score: string | null; bench_version: string; prompt_version: string;
  }>(`select r.id, r.status, m.display_name, m.slug as model_slug,
              r.started_at, r.finished_at, r.task_count, r.completed_count,
              r.failed_count, r.total_cost_usd, r.total_tokens_in, r.total_tokens_out,
              rts.total_score, r.bench_version, r.prompt_version
       from runs r join models m on m.id = r.model_id
       left join run_total_scores rts on rts.run_id = r.id
       where r.id = $1`, [runId]);
  const run = rows[0];
  if (!run) notFound();

  const { rows: results } = await query<{
    task_id: string; category_slug: string; score: string; eval_method: string;
    raw_output: string; gold_answer: string; latency_ms: number; error: string | null;
  }>(`select task_id, category_slug, score, eval_method, raw_output, gold_answer,
              latency_ms, error
       from task_results where run_id = $1 order by category_slug, task_id`, [runId]);

  return (
    <>
      <div className="eyebrow mb-3">Run #{run.id}</div>
      <h1 className="h1 mb-2">{run.display_name}</h1>
      <p className="text-sm text-[var(--tenki-muted)] mb-8">
        Status: <strong>{run.status}</strong> · Bench v{run.bench_version} · Prompt-hash {run.prompt_version}
      </p>

      <div className="grid sm:grid-cols-4 gap-4 mb-10">
        <Stat label="Total-score" value={formatScore(run.total_score)} mono />
        <Stat label="Fremdrift" value={`${run.completed_count}/${run.task_count}`} mono />
        <Stat label="Kostnad" value={formatCost(run.total_cost_usd)} mono />
        <Stat label="Tokens" value={`${formatNumber(run.total_tokens_in)} → ${formatNumber(run.total_tokens_out)}`} />
      </div>

      <div className="eyebrow mb-2">Per oppgave ({results.length})</div>
      <div className="border hairline border-[var(--tenki-subtle)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
              <th className="px-4 py-3 eyebrow">Oppgave</th>
              <th className="px-4 py-3 eyebrow">Kategori</th>
              <th className="px-4 py-3 eyebrow">Eval</th>
              <th className="px-4 py-3 eyebrow text-right">Score</th>
              <th className="px-4 py-3 eyebrow text-right">Latency</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.task_id} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/admin/runs/${run.id}/oppgave/${r.task_id}`}>{r.task_id}</Link>
                </td>
                <td className="px-4 py-3 text-[var(--tenki-muted)]">{r.category_slug}</td>
                <td className="px-4 py-3 text-[var(--tenki-muted)] text-xs font-mono">{r.eval_method}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {r.error ? <span className="text-red-700">feil</span> : formatScore(r.score)}
                </td>
                <td className="px-4 py-3 text-right text-[var(--tenki-muted)]">{r.latency_ms}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border hairline border-[var(--tenki-subtle)] bg-white p-4">
      <div className="eyebrow mb-1">{label}</div>
      <div className={mono ? "font-mono text-lg" : "text-lg"}>{value}</div>
    </div>
  );
}
