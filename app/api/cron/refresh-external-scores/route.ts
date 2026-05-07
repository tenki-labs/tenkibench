import { NextResponse, type NextRequest } from "next/server";
import { refreshArtificialAnalysisScores } from "@/lib/external-scores/refresh";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Cron: oppdater eksterne benchmark-scores fra Artificial Analysis.
 * Anbefales kjørt ukentlig.
 *
 * Eksempel cron på VPS:
 *   0 4 * * 1 curl -fsS -H "Authorization: Bearer $CRON_TOKEN" \
 *     https://bench.tenki.no/api/cron/refresh-external-scores
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_TOKEN}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshArtificialAnalysisScores();
    return NextResponse.json({
      ok: true,
      source: "artificial_analysis",
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
