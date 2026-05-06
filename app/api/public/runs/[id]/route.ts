import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public per-run export. Returns full per-task results.
 * Supports format=json (default) or format=csv.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const runId = Number(id);
  if (!Number.isInteger(runId)) {
    return NextResponse.json({ error: "invalid run id" }, { status: 400 });
  }

  const format = req.nextUrl.searchParams.get("format") ?? "json";

  const { rows: runRows } = await query<{
    id: number; status: string; bench_version: string; prompt_version: string;
    finished_at: string; total_score: string | null;
    model_slug: string; display_name: string; provider: string;
  }>(
    `select r.id, r.status, r.bench_version, r.prompt_version, r.finished_at,
            rts.total_score, m.slug as model_slug, m.display_name, m.provider
     from runs r join models m on m.id = r.model_id
     left join run_total_scores rts on rts.run_id = r.id
     where r.id = $1`,
    [runId],
  );
  const run = runRows[0];
  if (!run) return NextResponse.json({ error: "run not found" }, { status: 404 });

  const { rows: results } = await query<{
    task_id: string; category_slug: string; eval_method: string;
    score: string; latency_ms: number | null; tokens_in: number | null;
    tokens_out: number | null; cost_usd: string | null;
    raw_output: string | null; gold_answer: string | null;
    judge_rationale: string | null; error: string | null;
  }>(
    `select task_id, category_slug, eval_method, score, latency_ms,
            tokens_in, tokens_out, cost_usd, raw_output, gold_answer,
            judge_rationale, error
     from task_results where run_id = $1 order by category_slug, task_id`,
    [runId],
  );

  if (format === "csv") {
    const header = [
      "task_id", "category", "eval_method", "score",
      "latency_ms", "tokens_in", "tokens_out", "cost_usd", "error",
    ];
    const rows = [header.join(",")];
    for (const r of results) {
      rows.push([
        csv(r.task_id), csv(r.category_slug), csv(r.eval_method),
        r.score, r.latency_ms ?? "", r.tokens_in ?? "", r.tokens_out ?? "",
        r.cost_usd ?? "", csv(r.error ?? ""),
      ].join(","));
    }
    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tenkibench-run-${runId}.csv"`,
      },
    });
  }

  return NextResponse.json({
    run: {
      id: run.id,
      status: run.status,
      bench_version: run.bench_version,
      prompt_version: run.prompt_version,
      finished_at: run.finished_at,
      total_score: run.total_score,
      model: { slug: run.model_slug, name: run.display_name, provider: run.provider },
    },
    results,
  });
}

function csv(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
