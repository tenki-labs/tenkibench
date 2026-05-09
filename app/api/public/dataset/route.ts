import { NextResponse, type NextRequest } from "next/server";
import { loadAllTasks } from "@/lib/tasks/loader";
import type { Task } from "@/lib/tasks/schema";

// Dataset endpoint: serves all non-holdout tasks. Cached 5 minutes.
export const revalidate = 300;

type Format = "json" | "jsonl" | "csv";

function parseFormat(raw: string | null): Format {
  if (raw === "jsonl" || raw === "csv") return raw;
  return "json";
}

/**
 * Public dataset export. Returns every non-holdout task in the requested format.
 * Supports format=json (default) | jsonl | csv.
 */
export async function GET(req: NextRequest) {
  const format = parseFormat(req.nextUrl.searchParams.get("format"));
  const tasks = loadAllTasks(false);
  const date = new Date().toISOString().slice(0, 10);
  const filenameBase = `tenkibench-tasks-${date}`;

  if (format === "jsonl") {
    const body = tasks.map((t) => JSON.stringify(t)).join("\n") + "\n";
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.jsonl"`,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }

  if (format === "csv") {
    const header = ["id", "bench", "category", "title", "difficulty", "eval_method", "source", "tags"];
    const lines = [header.join(",")];
    for (const t of tasks) {
      lines.push([
        csv(t.id),
        csv(t.bench),
        csv(t.category),
        csv(t.title),
        csv(t.difficulty),
        csv(t.eval.method),
        csv(t.source),
        csv((t.tags ?? []).join("|")),
      ].join(","));
    }
    return new NextResponse(lines.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }

  // Default: JSON
  return NextResponse.json(
    {
      bench: "TenkiBench",
      version: "v0.6",
      methodology: "https://bench.tenki.no/metodikk",
      license: "CC BY 4.0",
      generated_at: new Date().toISOString(),
      count: tasks.length,
      tasks: tasks satisfies Task[],
    },
    {
      headers: {
        "Content-Disposition": `inline; filename="${filenameBase}.json"`,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}

function csv(s: string | null | undefined): string {
  const v = s ?? "";
  if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
