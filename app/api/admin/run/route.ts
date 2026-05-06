import { NextResponse, type NextRequest } from "next/server";
import { startRun, executeRun } from "@/lib/eval/runner";

export const runtime = "nodejs";
export const maxDuration = 600; // 10 minutes — for large runs

export async function POST(req: NextRequest) {
  const token = req.cookies.get("tenkibench_admin")?.value;
  if (token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { modelId: number; category?: string };
  if (!body.modelId) {
    return NextResponse.json({ error: "modelId required" }, { status: 400 });
  }

  const benchVersion = process.env.GIT_COMMIT?.slice(0, 7) ?? "dev";
  const runId = await startRun({
    modelId: body.modelId,
    category: body.category,
    benchVersion,
  });

  // Fire and forget. The client polls /admin/runs/[id] for progress.
  void executeRun(runId, {
    modelId: body.modelId,
    category: body.category,
    benchVersion,
  }).catch(async (err) => {
    const { query } = await import("@/lib/db");
    await query(
      `update runs set status = 'failed', notes = $1, finished_at = now() where id = $2`,
      [String(err?.message ?? err).slice(0, 1000), runId],
    );
  });

  return NextResponse.json({ runId });
}
