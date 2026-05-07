import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  parseCookie,
  verifyTenkiJwt,
  isStaff,
  type TenkiClaims,
} from "@/lib/tenki-sso";

/**
 * Server-action og API-route helper. Bruk i hver admin-handler/route som
 * ikke allerede er bak middleware (f.eks. POST-routes som POST /api/admin/run).
 *
 * Returns Tenki-claims hvis brukeren er staff. Kaster ellers — caller bør
 * fange og returnere 401/403.
 *
 * Eksempel i en API-route:
 *
 *   export async function POST(req) {
 *     try { await requireStaff(); }
 *     catch (e) { return NextResponse.json({ error: String(e.message) }, { status: 401 }); }
 *     // ... gjør jobben
 *   }
 */
export async function requireStaff(): Promise<TenkiClaims> {
  const c = await cookies();
  const access = c.get(SESSION_COOKIE)?.value ?? null;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET ikke satt");
  }
  const claims = verifyTenkiJwt(access, secret);
  if (!claims) {
    throw new Error("Ingen gyldig Tenki-sesjon");
  }
  if (!isStaff(claims)) {
    throw new Error(
      `Mangler staff-rolle (er: ${claims.user_metadata?.role ?? claims.role ?? "ingen"})`,
    );
  }
  return claims;
}

/**
 * Mykere variant: returnerer null istedenfor å kaste. Bruker når du vil vise
 * "logg inn for å gjøre X" istedenfor en hard 401.
 */
export async function getStaffClaims(): Promise<TenkiClaims | null> {
  try {
    return await requireStaff();
  } catch {
    return null;
  }
}
