import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { startRun, executeRun } from "@/lib/eval/runner";

export const runtime = "nodejs";
export const maxDuration = 600;

/**
 * Cron-triggered: run benchmark against every active model.
 * Hit by host crontab (or GitHub Actions) with Bearer token.
 *
 * Example: 0 3 1 */3 * curl -H "Authorization: Bearer $CRON_TOKEN" \
 *          https://bench.tenki.no/api/cron/run-all
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_TOKEN}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { rows: models } = await query<{ id: number; slug: string }>(
    `select id, slug from models where is_active = true`,
  );

  const benchVersion = process.env.GIT_COMMIT?.slice(0, 7) ?? "cron";
  const runIds: number[] = [];

  for (const m of models) {
    const runId = await startRun({ modelId: m.id, benchVersion });
    runIds.push(runId);
    void executeRun(runId, { modelId: m.id, benchVersion }).catch(async (err) => {
      await query(
        `update runs set status = 'failed', notes = $1, finished_at = now() where id = $2`,
        [String(err?.message ?? err).slice(0, 1000), runId],
      );
    });
  }

  return NextResponse.json({ started: runIds });
}
