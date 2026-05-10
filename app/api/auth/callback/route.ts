import { NextResponse, type NextRequest } from "next/server";
import { query, one } from "@/lib/db";
import { exchangeCode, getOidcConfig, verifyIdToken } from "@/lib/oidc-client";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  buildSessionSetCookie,
  isStaff,
} from "@/lib/tenki-sso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoredState = {
  state: string;
  code_verifier: string;
  redirect_to: string | null;
  expires_at: string;
};

/**
 * GET /api/auth/callback?code=...&state=...
 *
 * 1. Slå opp state i oidc_state — verifiser at den finnes og ikke er utløpt
 * 2. Bytt code mot tokens (auth.tenki.no/oauth/token, m/PKCE-verifier)
 * 3. Verifiser id_token-claims (signatur + exp + sub)
 * 4. Sjekk at brukeren har staff-rolle (super_admin | admin | employee)
 * 5. Skriv tenki_session + tenki_refresh på Domain=.tenki.no
 * 6. Slett state-raden, redirect til redirect_to (eller /admin)
 *
 * Feil i stegene 1–4 gir 4xx tilbake til brukeren med en lesbar Bokmål-feil.
 */
export async function GET(req: NextRequest) {
  const config = getOidcConfig();
  if (!config) {
    return new NextResponse(
      "oidc-callback: OIDC ikke konfigurert (mangler TENKI_OIDC_CLIENT_ID/SECRET)",
      { status: 500 },
    );
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    return new NextResponse(
      `oidc-callback: IdP-feil — ${errorParam}: ${req.nextUrl.searchParams.get("error_description") ?? ""}`,
      { status: 400 },
    );
  }
  if (!code || !state) {
    return new NextResponse("oidc-callback: mangler code eller state", { status: 400 });
  }

  // 1. Slå opp + valider state
  let stored: StoredState | null;
  try {
    stored = await one<StoredState>(
      `select state, code_verifier, redirect_to, expires_at
         from public.oidc_state
        where state = $1`,
      [state],
    );
  } catch (err) {
    return new NextResponse(
      `oidc-callback: DB-feil ved state-oppslag — ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 },
    );
  }
  if (!stored) {
    return new NextResponse("oidc-callback: ukjent state (mulig CSRF eller utløpt)", {
      status: 400,
    });
  }
  if (new Date(stored.expires_at).getTime() < Date.now()) {
    // Rydd opp den utløpte raden
    await query(`delete from public.oidc_state where state = $1`, [state]).catch(() => {});
    return new NextResponse("oidc-callback: state er utløpt — start login på nytt", {
      status: 400,
    });
  }

  // 2. Bytt code mot tokens
  const tokens = await exchangeCode({
    config,
    code,
    codeVerifier: stored.code_verifier,
  });
  if (!tokens) {
    return new NextResponse("oidc-callback: kunne ikke veksle code mot tokens", {
      status: 502,
    });
  }

  // 3. Verifiser id_token
  const claims = verifyIdToken(tokens.id_token, config.jwtSecret);
  if (!claims) {
    return new NextResponse("oidc-callback: ugyldig id_token (signatur/utløp)", {
      status: 401,
    });
  }

  // 4. Staff-rolle obligatorisk for /admin
  if (!isStaff(claims)) {
    return new NextResponse(
      `oidc-callback: kontoen ${claims.email ?? claims.sub} mangler staff-rolle på Tenki.`,
      { status: 403 },
    );
  }

  // 5. Slett state — single-use
  await query(`delete from public.oidc_state where state = $1`, [state]).catch(() => {});

  // 6. Sett cookies + redirect
  const redirectTo = stored.redirect_to ?? "/admin";
  // Tillat bare interne paths eller bench.tenki.no for å unngå open redirect.
  const safeRedirect = isSafeRedirect(redirectTo) ? redirectTo : "/admin";

  const res = NextResponse.redirect(new URL(safeRedirect, req.url), 302);

  // access_token er det vi setter som tenki_session — middleware/admin-auth
  // verifiserer den med samme HS256 SUPABASE_JWT_SECRET.
  res.headers.append(
    "Set-Cookie",
    buildSessionSetCookie({ name: SESSION_COOKIE, value: tokens.access_token }),
  );
  if (tokens.refresh_token) {
    res.headers.append(
      "Set-Cookie",
      buildSessionSetCookie({ name: REFRESH_COOKIE, value: tokens.refresh_token }),
    );
  }
  return res;
}

function isSafeRedirect(target: string): boolean {
  if (target.startsWith("/")) return true;
  try {
    const u = new URL(target);
    return u.hostname === "bench.tenki.no" || u.hostname.endsWith(".tenki.no");
  } catch {
    return false;
  }
}
