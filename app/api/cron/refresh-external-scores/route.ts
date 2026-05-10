import { NextResponse, type NextRequest } from "next/server";
import {
  refreshAll,
  refreshArtificialAnalysis,
  refreshLmArena,
  refreshOpenLlmLeaderboard,
  refreshOpenLlmResults,
} from "@/lib/external-scores/refresh";
import { isAutoRefreshEnabled } from "@/lib/system-settings";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * Cron-rute: oppdater eksterne benchmark-scores.
 * Bearer-auth via CRON_TOKEN.
 *
 * Query: ?source=artificial_analysis | lmarena | open_llm | open_llm_results | all (default)
 *
 * Without ?source the call is treated as the daily auto-refresh and respects
 * the `external_scores_auto_refresh_enabled` kill-switch in `system_settings`.
 * With an explicit ?source the call is treated as a manual override (e.g. an
 * admin clicking a button) and runs unconditionally.
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

  const sourceParam = req.nextUrl.searchParams.get("source");
  const isAutoTrigger = sourceParam === null;

  // Kill-switch only applies to the unattended daily run. Manual ?source=...
  // calls always proceed so admins can force a refresh from the UI.
  if (isAutoTrigger) {
    const enabled = await isAutoRefreshEnabled();
    if (!enabled) {
      // Log a marker row so the admin page can show "skipped" history.
      await query(
        `insert into external_score_refreshes
           (source, status, finished_at, error)
         values ('cron_auto', 'skipped', now(), 'auto_refresh_disabled')`,
      );
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "auto_refresh_disabled",
      });
    }

    // Drop a marker row so the admin page can list when the daily cron fired.
    await query(
      `insert into external_score_refreshes (source, status, finished_at)
         values ('cron_auto', 'finished', now())`,
    );
  }

  const source = sourceParam ?? "all";

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
    if (source === "open_llm_results") {
      return NextResponse.json({ ok: true, ...(await refreshOpenLlmResults()) });
    }
    return NextResponse.json({ ok: true, ...(await refreshAll()) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
