import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import {
  buildAuthorizeUrl,
  generateCodeVerifier,
  generateState,
  getOidcConfig,
} from "@/lib/oidc-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/login
 *
 * Starter OIDC Authorization Code + PKCE-flyten mot auth.tenki.no.
 *
 * 1. Generer state + code_verifier
 * 2. Lagre dem i oidc_state (10 min utløp) sammen med ?next=
 * 3. Redirect til auth.tenki.no/oauth/authorize med code_challenge=S256(verifier)
 *
 * Hvis OIDC ikke er konfigurert (env-vars mangler), faller vi tilbake til
 * legacy login-redirect.
 */
export async function GET(req: NextRequest) {
  const config = getOidcConfig();
  if (!config) {
    // Fallback: ingen OIDC konfigurert. Send brukeren til auth.tenki.no via
    // den gamle cookie-shared SSO-veien.
    const next = req.nextUrl.searchParams.get("next") ?? "https://bench.tenki.no/admin";
    const fallback =
      process.env.TENKI_LOGIN_URL ?? "https://auth.tenki.no/admin/login";
    const url = new URL(fallback);
    url.searchParams.set("next", next);
    return NextResponse.redirect(url.toString(), 302);
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const redirectTo = req.nextUrl.searchParams.get("next");

  // 10 minutters utløp — godt rom for at brukeren rekker å fullføre login,
  // men ikke så langt at en lekket state-streng er evig brukbar.
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  try {
    await query(
      `insert into public.oidc_state (state, code_verifier, redirect_to, expires_at)
       values ($1, $2, $3, $4)`,
      [state, codeVerifier, redirectTo, expiresAt],
    );
  } catch (err) {
    return new NextResponse(
      `oidc-login: kunne ikke lagre state — ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 },
    );
  }

  const authorizeUrl = buildAuthorizeUrl({ config, state, codeVerifier });
  return NextResponse.redirect(authorizeUrl, 302);
}
