import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    await query("select 1");
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    return NextResponse.json({ status: "degraded", error: String(e) }, { status: 503 });
  }
}
