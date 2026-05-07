// tenki-sso.ts — drop-in Tenki SSO consumer.
//
// Verifies tenki_session cookies minted by tenki.no / auth.tenki.no, and
// refreshes them via auth.tenki.no/auth/v1/token when they near expiry.
//
// Zero deps beyond Node's built-in `crypto` and `fetch` (Node 18+, Bun, Deno).
// For Cloudflare Workers / edge runtimes that lack `node:crypto`, swap the
// HMAC verification block (marked below) for the Web Crypto equivalent.
//
// Reference implementation. The mirror copy on the central server is in
// tenki-labs/website at lib/admin-auth.ts (verifySupabaseJwt) +
// middleware.ts (refreshSupabaseSession). Keep them in sync if either side
// is patched.

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "tenki_session";
export const REFRESH_COOKIE = "tenki_refresh";

// 5-min leeway: refresh proactively when there's less than this much
// validity left, so a slow handler doesn't trip the expiry mid-render.
export const REFRESH_LEEWAY_S = 5 * 60;

// 90 days — must match what the central server uses when writing cookies,
// otherwise the user's session expires earlier on bench than on tenki.no.
export const SESSION_MAX_AGE_S = 90 * 24 * 3600;

export type TenkiClaims = {
  sub: string;
  email?: string;
  role?: string;
  user_metadata?: { role?: string; full_name?: string };
  exp?: number;
};

export type TenkiSession = {
  claims: TenkiClaims;
  token: string;
};

// ---------------------------------------------------------------------------
// Cookie parsing
// ---------------------------------------------------------------------------

export function parseCookie(cookieHeader: string, name: string): string | null {
  if (!cookieHeader) return null;
  for (const raw of cookieHeader.split(";")) {
    const [k, ...rest] = raw.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

// ---------------------------------------------------------------------------
// JWT verification (HS256)
// ---------------------------------------------------------------------------

function b64urlToBuf(s: string): Buffer {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/**
 * Verify a Tenki access JWT and return its claims.
 * Returns null if the token is malformed, signature-invalid, or expired.
 *
 * @param token  The raw JWT string (e.g. value of `tenki_session` cookie).
 * @param secret The shared HS256 secret (`SUPABASE_JWT_SECRET`).
 */
export function verifyTenkiJwt(
  token: string | null | undefined,
  secret: string,
): TenkiClaims | null {
  if (!token) return null;
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;

  // --- Web Crypto swap point ----------------------------------------------
  // For Cloudflare Workers / edge: replace this block with crypto.subtle
  // .importKey + .verify on HMAC-SHA-256. The signing input is `${h}.${p}`,
  // the signature is the base64url-decoded `s`. Everything else stays.
  const expected = createHmac("sha256", secret)
    .update(`${h}.${p}`)
    .digest("base64url");
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  // ------------------------------------------------------------------------

  try {
    const claims = JSON.parse(b64urlToBuf(p).toString("utf8")) as TenkiClaims;
    if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

/**
 * Pull `tenki_session` from a cookie header and verify it in one call.
 * Returns the verified session (claims + raw token) or null.
 */
export function verifyTenkiSession(
  cookieHeader: string,
  secret: string,
): TenkiSession | null {
  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;
  const claims = verifyTenkiJwt(token, secret);
  if (!claims) return null;
  return { claims, token };
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

export type RefreshResult = {
  access_token: string;
  refresh_token: string;
};

/**
 * Exchange a refresh token for a fresh access+refresh pair via auth.tenki.no.
 * Returns the new tokens, or null on any error (network, 4xx, malformed).
 *
 * The new refresh_token MUST replace the old one in the cookie — Supabase
 * GoTrue rotates refresh tokens on each use, so reusing the old one fails
 * with `invalid_grant`.
 */
export async function refreshTenkiSession(args: {
  refreshToken: string;
  authBaseUrl: string;     // e.g. "https://auth.tenki.no"
  anonKey: string;         // SUPABASE_ANON_KEY (publishable)
}): Promise<RefreshResult | null> {
  const { refreshToken, authBaseUrl, anonKey } = args;
  if (!refreshToken || !authBaseUrl || !anonKey) return null;

  try {
    const res = await fetch(
      `${authBaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<RefreshResult>;
    if (!data.access_token || !data.refresh_token) return null;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie writing — match the central server's attributes exactly
// ---------------------------------------------------------------------------

/**
 * Build a Set-Cookie header value for tenki_session / tenki_refresh that
 * matches what the central server writes. CRITICAL: Domain=.tenki.no (with
 * the leading dot) so the cookie remains visible to every *.tenki.no app.
 * Writing Domain=bench.tenki.no instead would make it host-only and
 * effectively log the user out on tenki.no after the next refresh.
 */
export function buildSessionSetCookie(args: {
  name: typeof SESSION_COOKIE | typeof REFRESH_COOKIE;
  value: string;
  maxAgeS?: number;
}): string {
  const { name, value, maxAgeS = SESSION_MAX_AGE_S } = args;
  return [
    `${name}=${value}`,
    "Domain=.tenki.no",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeS}`,
  ].join("; ");
}

// ---------------------------------------------------------------------------
// Role helpers (mirror central server's lib/admin-auth.ts)
// ---------------------------------------------------------------------------

export function roleOf(claims: TenkiClaims): string | undefined {
  return claims.user_metadata?.role ?? claims.role;
}

export function isStaff(claims: TenkiClaims): boolean {
  const r = roleOf(claims);
  return r === "super_admin" || r === "admin" || r === "employee";
}

export function isSuperAdmin(claims: TenkiClaims): boolean {
  return roleOf(claims) === "super_admin";
}
