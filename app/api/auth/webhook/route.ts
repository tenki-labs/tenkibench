import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/oidc-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/webhook
 *
 * Mottar event-pushes fra tenki.no når noe skjer med en bruker:
 *   - logout         — bruker logget ut sentralt; vi bør rydde lokale sesjoner
 *   - role_change    — rolle endret; cache-invalidering bør skje
 *   - user_deleted   — bruker slettet; alt knyttet til user_id bør ryddes
 *
 * Påkrevd header: `X-Tenki-Signature: sha256=<hex>` der hex =
 *   HMAC-SHA-256(rå-body, TENKI_OIDC_CLIENT_SECRET).
 *
 * Fase 1 (nå): vi bare logger eventen til auth_webhook_events og returnerer
 * 200. Fase 2 (senere): faktisk reagere på eventene (clear sessions etc.).
 */
export async function POST(req: NextRequest) {
  const clientSecret = process.env.TENKI_OIDC_CLIENT_SECRET;
  if (!clientSecret) {
    return NextResponse.json(
      { error: "webhook ikke konfigurert (TENKI_OIDC_CLIENT_SECRET mangler)" },
      { status: 503 },
    );
  }

  const signatureHeader = req.headers.get("x-tenki-signature");
  // Vi MÅ lese rå body som tekst — JSON.parse + stringify endrer formattering
  // og bryter HMAC. Så: tekst først, parse etter signaturen er sjekket.
  const rawBody = await req.text();

  const ok = verifyWebhookSignature({
    rawBody,
    signatureHeader,
    clientSecret,
  });
  if (!ok) {
    return NextResponse.json({ error: "ugyldig signatur" }, { status: 401 });
  }

  let parsed: { event?: string; user_id?: string; [k: string]: unknown };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "body er ikke JSON" }, { status: 400 });
  }

  const event = typeof parsed.event === "string" ? parsed.event : "unknown";
  const userId = typeof parsed.user_id === "string" ? parsed.user_id : null;

  try {
    await query(
      `insert into public.auth_webhook_events (event, user_id, payload, signature)
       values ($1, $2, $3::jsonb, $4)`,
      [event, userId, rawBody, signatureHeader],
    );
  } catch (err) {
    // Vi vil heller logge mislykkede DB-skriv enn å droppe webhooket — IdP
    // vil retry-e hvis vi returnerer 5xx, og det forplanter problemer.
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
