import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import type { ExternalScores } from "@/lib/external-scores/types";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type Format = "json" | "jsonl" | "csv";

function parseFormat(raw: string | null): Format {
  if (raw === "jsonl" || raw === "csv") return raw;
  return "json";
}

interface LeaderboardRow {
  model: string;
  name: string;
  provider: string;
  family: string | null;
  open_weights: boolean;
  total_score: string | null;
  knowledge_score: string | null;
  reasoning_score: string | null;
  bench_version: string;
  prompt_version: string;
  finished_at: string;
  categories: Record<string, number>;
  external_scores: ExternalScores | null;
}

/**
 * Public leaderboard API. Used by third parties to cite scores.
 * Supports format=json (default) | jsonl | csv.
 */
export async function GET(req: NextRequest) {
  const format = parseFormat(req.nextUrl.searchParams.get("format"));

  const { rows } = await query<LeaderboardRow>(`
    with latest as (
      select distinct on (r.model_id) r.id as run_id, r.model_id, r.finished_at,
                                       r.bench_version, r.prompt_version
      from runs r
      where r.status = 'finished'
      order by r.model_id, r.finished_at desc
    )
    select
      m.slug as model,
      m.display_name as name,
      m.provider,
      m.family,
      m.is_open_weights as open_weights,
      rts.total_score,
      rts.knowledge_score,
      rts.reasoning_score,
      latest.bench_version,
      latest.prompt_version,
      latest.finished_at,
      coalesce(json_object_agg(rcs.category_slug, rcs.mean_score)
               filter (where rcs.category_slug is not null), '{}'::json) as categories,
      m.external_scores
    from latest
    join models m on m.id = latest.model_id
    join run_total_scores rts on rts.run_id = latest.run_id
    left join run_category_scores rcs on rcs.run_id = latest.run_id
    where m.is_active = true
    group by m.slug, m.display_name, m.provider, m.family, m.is_open_weights,
             rts.total_score, rts.knowledge_score, rts.reasoning_score,
             latest.bench_version, latest.prompt_version, latest.finished_at,
             m.external_scores
    order by rts.total_score desc
  `);

  const date = new Date().toISOString().slice(0, 10);
  const filenameBase = `tenkibench-leaderboard-${date}`;

  if (format === "jsonl") {
    const body = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.jsonl"`,
      },
    });
  }

  if (format === "csv") {
    const header = [
      "model_slug",
      "display_name",
      "provider",
      "family",
      "total_score",
      "knowledge_score",
      "reasoning_score",
      "finished_at",
      "intelligence_index",
      "mmlu_pro",
      "gpqa_diamond",
      "humaneval",
      "lmarena_elo",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      const aa = r.external_scores?.artificial_analysis;
      const arena = r.external_scores?.lmarena;
      lines.push([
        csv(r.model),
        csv(r.name),
        csv(r.provider),
        csv(r.family ?? ""),
        r.total_score ?? "",
        r.knowledge_score ?? "",
        r.reasoning_score ?? "",
        csv(r.finished_at ?? ""),
        aa?.intelligence_index ?? "",
        aa?.scores?.mmlu_pro ?? "",
        aa?.scores?.gpqa_diamond ?? "",
        aa?.scores?.humaneval ?? "",
        arena?.elo ?? "",
      ].join(","));
    }
    return new NextResponse(lines.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  return NextResponse.json({
    bench: "TenkiBench",
    version: "0.1",
    methodology: "https://bench.tenki.no/metodikk",
    license: "CC BY 4.0 (cite tenki.no)",
    generated_at: new Date().toISOString(),
    leaderboard: rows,
  });
}

function csv(s: string | null | undefined): string {
  const v = s ?? "";
  if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
