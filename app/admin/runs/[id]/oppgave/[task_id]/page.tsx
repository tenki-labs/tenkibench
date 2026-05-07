import { query } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadTask } from "@/lib/tasks/loader";
import { formatScore, formatCost } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface RubricRow {
  criterion: string;
  score: number;
  max: number;
  comment?: string;
}

export default async function TaskResultDetail({
  params,
}: {
  params: Promise<{ id: string; task_id: string }>;
}) {
  const { id, task_id } = await params;
  const runId = Number(id);

  const { rows } = await query<{
    raw_output: string | null; parsed_answer: string | null; gold_answer: string | null;
    eval_method: string; score: string; latency_ms: number | null;
    tokens_in: number | null; tokens_out: number | null; cost_usd: string | null;
    judge_rubric: RubricRow[] | null; judge_rationale: string | null;
    error: string | null; category_slug: string;
    model_display_name: string; model_slug: string;
  }>(`select tr.raw_output, tr.parsed_answer, tr.gold_answer, tr.eval_method,
              tr.score, tr.latency_ms, tr.tokens_in, tr.tokens_out, tr.cost_usd,
              tr.judge_rubric, tr.judge_rationale, tr.error, tr.category_slug,
              m.display_name as model_display_name, m.slug as model_slug
       from task_results tr
       join runs r on r.id = tr.run_id
       join models m on m.id = r.model_id
       where tr.run_id = $1 and tr.task_id = $2`, [runId, task_id]);
  const result = rows[0];
  if (!result) notFound();

  const task = loadTask(task_id);

  return (
    <>
      <div className="eyebrow mb-3">Run #{runId} · {result.category_slug}</div>
      <h1 className="h1 mb-2 font-mono text-2xl">{task_id}</h1>
      <p className="text-sm text-[var(--tenki-muted)] mb-8">
        {result.model_display_name} ·
        Score: <span className="font-mono">{formatScore(result.score)}</span>
        {result.latency_ms != null && <> · {result.latency_ms}ms</>}
        {result.cost_usd != null && <> · {formatCost(result.cost_usd)}</>}
        {result.tokens_in != null && <> · {result.tokens_in}/{result.tokens_out} tokens</>}
        <span className="ml-3"><Link href={`/oppgaver/${task_id}`} className="underline">Oppgave-spec →</Link></span>
      </p>

      {result.error && (
        <section className="mb-8 border-l-4 border-red-700 pl-4">
          <div className="eyebrow mb-2 text-red-700">Feil under kjøring</div>
          <pre className="text-sm whitespace-pre-wrap">{result.error}</pre>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <div className="eyebrow mb-2">Modell-svar</div>
          <pre className="rounded-xl border border-tenki-subtle bg-white overflow-hidden p-4 text-sm whitespace-pre-wrap font-sans max-h-[600px] overflow-auto">
{result.raw_output ?? "—"}
          </pre>
          {result.parsed_answer && result.parsed_answer !== result.raw_output && (
            <>
              <div className="eyebrow mb-2 mt-4">Etter parsing</div>
              <pre className="rounded-xl border border-tenki-subtle bg-white overflow-hidden p-4 text-sm whitespace-pre-wrap font-mono">
{result.parsed_answer}
              </pre>
            </>
          )}
        </section>

        <section>
          <div className="eyebrow mb-2">Gull-standard</div>
          <pre className="rounded-xl border border-tenki-subtle bg-white overflow-hidden p-4 text-sm whitespace-pre-wrap font-mono">
{result.gold_answer ?? "—"}
          </pre>

          {task && (
            <>
              <div className="eyebrow mb-2 mt-4">Oppgave</div>
              <pre className="rounded-xl border border-tenki-subtle bg-white overflow-hidden p-4 text-sm whitespace-pre-wrap font-sans">
{task.user_prompt}
              </pre>
            </>
          )}

          {result.judge_rubric && Array.isArray(result.judge_rubric) && (
            <>
              <div className="eyebrow mb-2 mt-4">Dommer-rubrikk</div>
              <div className="rounded-xl border border-tenki-subtle bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
                      <th className="px-3 py-2 eyebrow">Kriterium</th>
                      <th className="px-3 py-2 eyebrow text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.judge_rubric.map((r, i) => (
                      <tr key={i} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                        <td className="px-3 py-2">
                          <div>{r.criterion}</div>
                          {r.comment && <div className="text-xs text-[var(--tenki-muted)] mt-1">{r.comment}</div>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{(r.score * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.judge_rationale && (
                <p className="mt-3 text-sm text-[var(--tenki-muted)] italic">
                  "{result.judge_rationale}"
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
