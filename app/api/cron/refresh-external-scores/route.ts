import { NextResponse, type NextRequest } from "next/server";
import {
  refreshAll,
  refreshArtificialAnalysis,
  refreshLmArena,
  refreshOpenLlmLeaderboard,
} from "@/lib/external-scores/refresh";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * Cron-rute: oppdater eksterne benchmark-scores.
 * Bearer-auth via CRON_TOKEN.
 *
 * Query: ?source=artificial_analysis | lmarena | open_llm | all (default)
 *
 * Eksempler:
 *   curl -H "Authorization: Bearer $CRON_TOKEN" \
 *     https://bench.tenki.no/api/cron/refresh-external-scores
 *   curl -H "Authorization: Bearer $CRON_TOKEN" \
 *     "https://bench.tenki.no/api/cron/refresh-external-scores?source=lmarena"
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_TOKEN}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const source = req.nextUrl.searchParams.get("source") ?? "all";

  try {
    if (source === "artificial_analysis") {
      return NextResponse.json({ ok: true, ...(await refreshArtificialAnalysis()) });
    }
    if (source === "lmarena") {
      return NextResponse.json({ ok: true, ...(await refreshLmArena()) });
    }
    if (source === "open_llm") {
      return NextResponse.json({ ok: true, ...(await refreshOpenLlmLeaderboard()) });
    }
    return NextResponse.json({ ok: true, ...(await refreshAll()) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
