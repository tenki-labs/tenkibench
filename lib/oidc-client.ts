// oidc-client.ts — Tenki SSO som OIDC-klient (Authorization Code + PKCE).
//
// bench.tenki.no kan registreres som proper OIDC-klient på tenki.no/admin/sso.
// Når TENKI_OIDC_CLIENT_ID + TENKI_OIDC_CLIENT_SECRET er satt, bruker vi
// denne flyten. Cookie-shared SSO (lib/tenki-sso.ts) er fortsatt fallback
// for brukere som ikke har migrert.
//
// Spec: RFC 6749 (OAuth 2.0) + RFC 7636 (PKCE) + OpenID Connect Core 1.0.
//
// IdP er auth.tenki.no — som er Supabase GoTrue under panseret. Derfor kan
// id_token verifiseres med samme HS256 SUPABASE_JWT_SECRET som cookie-flyten,
// så lenge GoTrue ikke har migrert til RS256. JWKS_URL er forhåndsbygd inn
// for fremtidig migrering.

import { createHmac, timingSafeEqual, randomBytes, createHash } from "node:crypto";
import type { TenkiClaims } from "@/lib/tenki-sso";

// ---------------------------------------------------------------------------
// Konfig — alle env-vars validert ved boot via getOidcConfig()
// ---------------------------------------------------------------------------

export type OidcConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  jwksUrl?: string; // valgfritt — for fremtidig RS256-migrering
  jwtSecret: string; // SUPABASE_JWT_SECRET (samme som cookie-flyten)
};

/**
 * Sjekk om OIDC er konfigurert. Returnerer null hvis env-vars mangler —
 * caller bør falle tilbake til cookie-shared SSO.
 */
export function getOidcConfig(): OidcConfig | null {
  const clientId = process.env.TENKI_OIDC_CLIENT_ID;
  const clientSecret = process.env.TENKI_OIDC_CLIENT_SECRET;
  const redirectUri = process.env.TENKI_OIDC_REDIRECT_URI;
  const authorizeUrl = process.env.TENKI_OIDC_AUTHORIZE_URL;
  const tokenUrl = process.env.TENKI_OIDC_TOKEN_URL;
  const jwksUrl = process.env.TENKI_OIDC_JWKS_URL;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!clientId || !clientSecret || !redirectUri || !authorizeUrl || !tokenUrl || !jwtSecret) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    authorizeUrl,
    tokenUrl,
    jwksUrl,
    jwtSecret,
  };
}

// ---------------------------------------------------------------------------
// PKCE-helpers — RFC 7636
// ---------------------------------------------------------------------------

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToBuf(s: string): Buffer {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/**
 * Generer en kryptografisk tilfeldig streng for `state` (CSRF-vern).
 * 32 bytes → 43-tegn base64url.
 */
export function generateState(): string {
  return b64url(randomBytes(32));
}

/**
 * Generer en PKCE code_verifier — 43–128 tegn, base64url-alfabet.
 * Vi bruker 32 bytes → 43 tegn, godt innenfor spec.
 */
export function generateCodeVerifier(): string {
  return b64url(randomBytes(32));
}

/**
 * S256 code_challenge fra code_verifier:
 *   base64url(sha256(verifier))
 */
export function codeChallengeFromVerifier(verifier: string): string {
  return b64url(createHash("sha256").update(verifier).digest());
}

// ---------------------------------------------------------------------------
// Authorize-URL bygging
// ---------------------------------------------------------------------------

/**
 * Bygg URL-en brukeren skal redirecte til på auth.tenki.no for å starte
 * authorization code-flyten. State + code_verifier MÅ lagres på serveren
 * i mellomtiden (oidc_state-tabellen) — ikke send dem med klienten.
 */
export function buildAuthorizeUrl(args: {
  config: OidcConfig;
  state: string;
  codeVerifier: string;
  scopes?: string[];
}): string {
  const { config, state, codeVerifier, scopes = ["openid", "profile", "email"] } = args;
  const challenge = codeChallengeFromVerifier(codeVerifier);
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token-utveksling
// ---------------------------------------------------------------------------

export type TokenResponse = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
};

/**
 * Bytt authorization code mot tokens. POST til tokenUrl med
 * grant_type=authorization_code + PKCE-verifier + client-credentials.
 *
 * Returnerer null på enhver feil (nettverk, 4xx, malformed).
 */
export async function exchangeCode(args: {
  config: OidcConfig;
  code: string;
  codeVerifier: string;
}): Promise<TokenResponse | null> {
  const { config, code, codeVerifier } = args;
  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: codeVerifier,
    });

    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = (await res.json()) as Partial<TokenResponse>;
    if (!data.access_token || !data.id_token) return null;
    return {
      access_token: data.access_token,
      id_token: data.id_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// id_token-verifisering — HS256 i dag, RS256-klar via jwksUrl i morgen
// ---------------------------------------------------------------------------

/**
 * Verifiser et id_token mot delt SUPABASE_JWT_SECRET (HS256). Returnerer
 * claims, eller null hvis signaturen er ugyldig / token er utløpt /
 * malformed.
 *
 * NB: Dette speiler verifyTenkiJwt i lib/tenki-sso.ts. Hvis IdP migrerer
 * til RS256 må vi swappe denne ut med en JWKS-basert verifier
 * (config.jwksUrl er allerede klar).
 */
export function verifyIdToken(idToken: string, jwtSecret: string): TenkiClaims | null {
  if (!idToken || !jwtSecret) return null;
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;

  let header: { alg?: string };
  try {
    header = JSON.parse(b64urlToBuf(h).toString("utf8"));
  } catch {
    return null;
  }
  if (header.alg !== "HS256") {
    // Hvis alg = RS256 må vi gå JWKS-veien — ikke implementert ennå.
    return null;
  }

  const expected = createHmac("sha256", jwtSecret).update(`${h}.${p}`).digest("base64url");
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const claims = JSON.parse(b64urlToBuf(p).toString("utf8")) as TenkiClaims;
    if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) return null;
    if (!claims.sub) return null;
    return claims;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Webhook-signaturverifisering — HMAC-SHA-256 over rå body
// ---------------------------------------------------------------------------

/**
 * Verifiser at et webhook-payload kommer fra tenki.no.
 *
 * Header: `X-Tenki-Signature: sha256=<hex>`
 * Signaturen er HMAC-SHA-256(rawBody, TENKI_OIDC_CLIENT_SECRET).
 * Returnerer false ved enhver inkonsistens — bruk timing-safe compare.
 */
export function verifyWebhookSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
  clientSecret: string;
}): boolean {
  const { rawBody, signatureHeader, clientSecret } = args;
  if (!signatureHeader || !clientSecret) return false;

  const match = signatureHeader.match(/^sha256=([0-9a-fA-F]+)$/);
  if (!match) return false;
  const provided = match[1].toLowerCase();

  const expected = createHmac("sha256", clientSecret).update(rawBody).digest("hex");

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
