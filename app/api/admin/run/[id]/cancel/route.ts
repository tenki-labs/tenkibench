import { NextResponse, type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { signalCancel } from "@/lib/eval/runner";
import { requireStaff } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireStaff();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }

  const { id } = await params;
  const runId = Number(id);
  if (!Number.isInteger(runId)) {
    return NextResponse.json({ error: "invalid run id" }, { status: 400 });
  }

  signalCancel(runId);
  await query(
    `update runs set status = 'cancelled', finished_at = now(),
       notes = coalesce(notes,'') || ' [cancelled by admin]'
     where id = $1 and status in ('pending','running')`,
    [runId],
  );

  redirect(`/admin/runs/${runId}`);
}
