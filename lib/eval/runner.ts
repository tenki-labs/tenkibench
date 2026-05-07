import { query } from "@/lib/db";
import { loadAllTasks, loadHoldoutTasks } from "@/lib/tasks/loader";
import type { Task } from "@/lib/tasks/schema";
import type { ModelRow } from "@/lib/llm/types";
import { makeClient } from "@/lib/llm";
import {
  evaluateExactString,
  evaluateJsonSchema,
  evaluateLlmJudge,
  evaluateNumericExact,
  evaluateRegex,
  evaluateRegexAll,
  type EvalResult,
} from "./methods";
import { createHash } from "node:crypto";

export interface RunOptions {
  modelId: number;
  category?: string;
  taskIds?: string[];
  benchVersion?: string;
  judgeModelId?: number;
  includeHoldout?: boolean;
}

// In-process cancel signals. Survives until the process restarts.
const cancelSignals = new Set<number>();

export function signalCancel(runId: number): void {
  cancelSignals.add(runId);
}

export function isCancelled(runId: number): boolean {
  return cancelSignals.has(runId);
}

export async function startRun(opts: RunOptions): Promise<number> {
  const tasks = filterTasks(loadAllTasks(opts.includeHoldout), opts);
  const promptHash = hashPrompts(tasks);
  const benchVersion = opts.benchVersion ?? "dev";
  const { rows } = await query<{ id: number }>(
    `insert into runs (model_id, status, task_count, bench_version, prompt_version)
     values ($1, 'running', $2, $3, $4)
     returning id`,
    [opts.modelId, tasks.length, benchVersion, promptHash],
  );
  return rows[0]!.id;
}

export async function executeRun(
  runId: number,
  opts: RunOptions,
  onProgress?: (done: number, total: number, taskId: string) => void,
): Promise<void> {
  const model = await getModel(opts.modelId);
  if (!model) throw new Error(`Model ${opts.modelId} not found`);

  const judge = opts.judgeModelId ? await getModel(opts.judgeModelId) : await getDefaultJudge();
  const judgeClient = judge ? makeClient(judge) : null;

  const tasks = filterTasks(loadAllTasks(opts.includeHoldout), opts);
  const client = makeClient(model);

  let done = 0;
  let failed = 0;
  let totalCost = 0;
  let totalIn = 0;
  let totalOut = 0;

  for (const task of tasks) {
    if (isCancelled(runId)) break;

    try {
      const llm = await invokeWithRetry(
        () => client.invoke({
          systemPrompt: task.system_prompt,
          userPrompt: task.user_prompt,
          temperature: 0,
          maxTokens: 2048,
          responseFormat: task.eval.method === "json_schema" ? "json" : "text",
        }),
        { max: 3, baseDelayMs: 1000 },
      );

      const evalResult = await evaluateOne(task, llm.text, judgeClient);

      await query(
        `insert into task_results
           (run_id, task_id, category_slug, raw_output, parsed_answer, gold_answer,
            eval_method, score, judge_model_id, judge_rubric, judge_rationale,
            latency_ms, tokens_in, tokens_out, cost_usd)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          runId,
          task.id,
          task.category,
          llm.text,
          evalResult.parsedAnswer,
          task.gold_answer,
          task.eval.method,
          evalResult.score,
          judge?.id ?? null,
          evalResult.judgeRubric ? JSON.stringify(evalResult.judgeRubric) : null,
          evalResult.judgeRationale ?? null,
          llm.latencyMs,
          llm.tokensIn,
          llm.tokensOut,
          llm.costUsd + (evalResult.judgeCostUsd ?? 0),
        ],
      );
      totalCost += llm.costUsd + (evalResult.judgeCostUsd ?? 0);
      totalIn += llm.tokensIn;
      totalOut += llm.tokensOut;
    } catch (err) {
      failed += 1;
      await query(
        `insert into task_results
           (run_id, task_id, category_slug, eval_method, score, error)
         values ($1, $2, $3, $4, 0, $5)`,
        [runId, task.id, task.category, task.eval.method, (err as Error).message],
      );
    }
    done += 1;
    onProgress?.(done, tasks.length, task.id);
    await query(
      `update runs set completed_count = $1, failed_count = $2, total_cost_usd = $3,
       total_tokens_in = $4, total_tokens_out = $5 where id = $6`,
      [done, failed, totalCost, totalIn, totalOut, runId],
    );
  }

  if (isCancelled(runId)) {
    cancelSignals.delete(runId);
    // Run was cancelled mid-flight — leave run row alone (already set to 'cancelled' by handler)
    // but materialize whatever scores we did manage to compute
    await materializeAggregates(runId);
    return;
  }

  await materializeAggregates(runId);

  await query(
    `update runs set status = 'finished', finished_at = now() where id = $1
     and status = 'running'`,
    [runId],
  );
}

async function invokeWithRetry<T>(
  fn: () => Promise<T>,
  opts: { max: number; baseDelayMs: number },
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < opts.max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === opts.max - 1) throw err;
      const delay = opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 250;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; code?: string; message?: string };
  // OpenAI-style errors expose .status; transient: 429, 500, 502, 503, 504
  if (e.status && [429, 500, 502, 503, 504].includes(e.status)) return true;
  if (e.code === "ECONNRESET" || e.code === "ETIMEDOUT" || e.code === "ENOTFOUND") return true;
  if (typeof e.message === "string" && /timeout|temporarily|rate limit/i.test(e.message)) return true;
  return false;
}

async function evaluateOne(
  task: Task,
  output: string,
  judge: ReturnType<typeof makeClient> | null,
): Promise<EvalResult> {
  switch (task.eval.method) {
    case "numeric_exact":
      return evaluateNumericExact(task, output);
    case "regex":
      return evaluateRegex(task, output);
    case "regex_all":
      return evaluateRegexAll(task, output);
    case "exact_string":
      return evaluateExactString(task, output);
    case "json_schema":
      return evaluateJsonSchema(task, output);
    case "llm_judge":
      if (!judge) throw new Error("llm_judge eval requires a judge model configured");
      return evaluateLlmJudge(task, output, judge);
  }
}

async function materializeAggregates(runId: number): Promise<void> {
  await query(
    `insert into run_category_scores (run_id, category_slug, task_count, mean_score, median_score)
     select run_id, category_slug, count(*),
            avg(score)::numeric(4,3),
            percentile_cont(0.5) within group (order by score)::numeric(4,3)
     from task_results
     where run_id = $1
     group by run_id, category_slug
     on conflict (run_id, category_slug) do update set
       task_count = excluded.task_count,
       mean_score = excluded.mean_score,
       median_score = excluded.median_score`,
    [runId],
  );

  // Total + knowledge + reasoning, alle vektet etter category.weight.
  // FILTER-klausuler beregner kind-spesifikke aggregater i samme query.
  await query(
    `insert into run_total_scores (
       run_id, total_score, category_count,
       knowledge_score, knowledge_count,
       reasoning_score, reasoning_count
     )
     select rcs.run_id,
            (sum(rcs.mean_score * c.weight) / nullif(sum(c.weight), 0))::numeric(4,3),
            count(*),
            (sum(rcs.mean_score * c.weight) filter (where c.kind = 'knowledge')
              / nullif(sum(c.weight) filter (where c.kind = 'knowledge'), 0))::numeric(4,3),
            count(*) filter (where c.kind = 'knowledge'),
            (sum(rcs.mean_score * c.weight) filter (where c.kind = 'reasoning')
              / nullif(sum(c.weight) filter (where c.kind = 'reasoning'), 0))::numeric(4,3),
            count(*) filter (where c.kind = 'reasoning')
     from run_category_scores rcs
     join categories c on c.slug = rcs.category_slug
     where rcs.run_id = $1
     group by rcs.run_id
     on conflict (run_id) do update set
       total_score = excluded.total_score,
       category_count = excluded.category_count,
       knowledge_score = excluded.knowledge_score,
       knowledge_count = excluded.knowledge_count,
       reasoning_score = excluded.reasoning_score,
       reasoning_count = excluded.reasoning_count,
       computed_at = now()`,
    [runId],
  );
}

async function getModel(id: number): Promise<ModelRow | null> {
  const { rows } = await query<ModelRow>(`select * from models where id = $1`, [id]);
  return rows[0] ?? null;
}

async function getDefaultJudge(): Promise<ModelRow | null> {
  const slug = process.env.JUDGE_MODEL ?? "claude-opus-4-7";
  const { rows } = await query<ModelRow>(`select * from models where slug = $1`, [slug]);
  return rows[0] ?? null;
}

function filterTasks(tasks: Task[], opts: RunOptions): Task[] {
  let out = tasks;
  if (opts.category) out = out.filter((t) => t.category === opts.category);
  if (opts.taskIds?.length) out = out.filter((t) => opts.taskIds!.includes(t.id));
  return out;
}

function hashPrompts(tasks: Task[]): string {
  const concat = tasks
    .map((t) => `${t.id}|${t.system_prompt ?? ""}|${t.user_prompt}`)
    .sort()
    .join("\n");
  return createHash("sha256").update(concat).digest("hex").slice(0, 16);
}
