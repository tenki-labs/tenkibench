import { NextResponse, type NextRequest } from "next/server";
import { startRun, executeRun } from "@/lib/eval/runner";
import { requireStaff } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(req: NextRequest) {
  try {
    await requireStaff();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
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
