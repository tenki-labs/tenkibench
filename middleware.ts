import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  SESSION_MAX_AGE_S,
  REFRESH_LEEWAY_S,
  parseCookie,
  verifyTenkiJwt,
  refreshTenkiSession,
  buildSessionSetCookie,
  isStaff,
} from "@/lib/tenki-sso";

/**
 * TenkiBench middleware:
 * - Public pages (leaderboard, benches, oppgaver, etc.) er åpne for alle
 * - /admin/* krever Tenki SSO-sesjon med staff-rolle
 *   (super_admin | admin | employee)
 * - /admin/login er public og redirecter videre til auth.tenki.no
 *
 * Cookie-konvensjon: tenki_session + tenki_refresh, Domain=.tenki.no.
 * Begge minted av tenki.no — vi verifiserer JWT-en lokalt med delt
 * SUPABASE_JWT_SECRET, og refresher via auth.tenki.no når den nærmer seg
 * utløp. Ingen separate brukere på bench-databasen.
 */

const ADMIN_LOGIN_URL = "https://auth.tenki.no/admin/login";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bare /admin/* krever auth — alt annet er public.
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const cookieHeader = req.headers.get("cookie") ?? "";
  const access = parseCookie(cookieHeader, SESSION_COOKIE);
  const refresh = parseCookie(cookieHeader, REFRESH_COOKIE);

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    return new NextResponse(
      "auth misconfigured: SUPABASE_JWT_SECRET ikke satt på bench-server",
      { status: 500 },
    );
  }

  let claims = verifyTenkiJwt(access, secret);
  let response = NextResponse.next();

  // Proaktiv refresh: hvis vi har refresh-token og access enten mangler
  // eller utløper snart, swap til nytt par før routen rendres.
  const nowS = Math.floor(Date.now() / 1000);
  const needsRefresh =
    refresh &&
    (claims == null || (claims.exp ?? 0) - nowS < REFRESH_LEEWAY_S);

  if (needsRefresh) {
    const fresh = await refreshTenkiSession({
      refreshToken: refresh,
      authBaseUrl: process.env.TENKI_AUTH_BASE_URL ?? "https://auth.tenki.no",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    });
    if (fresh) {
      // Skriv om Cookie-headeren på selve requesten så at downstream-kode
      // ser den ferske access-tokenen — uten dette ville RSC bouncet
      // bruker selv etter en vellykket refresh.
      const rewritten = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .filter(
          (c) =>
            !c.startsWith(`${SESSION_COOKIE}=`) &&
            !c.startsWith(`${REFRESH_COOKIE}=`),
        )
        .concat([
          `${SESSION_COOKIE}=${fresh.access_token}`,
          `${REFRESH_COOKIE}=${fresh.refresh_token}`,
        ])
        .join("; ");

      const reqHeaders = new Headers(req.headers);
      reqHeaders.set("cookie", rewritten);
      response = NextResponse.next({ request: { headers: reqHeaders } });

      // Skriv tilbake cookies til klienten med Domain=.tenki.no for å holde
      // sesjonen synlig på alle *.tenki.no-apper.
      response.headers.append(
        "Set-Cookie",
        buildSessionSetCookie({ name: SESSION_COOKIE, value: fresh.access_token }),
      );
      response.headers.append(
        "Set-Cookie",
        buildSessionSetCookie({ name: REFRESH_COOKIE, value: fresh.refresh_token }),
      );

      claims = verifyTenkiJwt(fresh.access_token, secret);
    }
  }

  // Ingen gyldig sesjon → finn rett login-rute.
  //
  // To moduser:
  //   a) OIDC-modus: TENKI_OIDC_CLIENT_ID er satt → send til vår egen
  //      /api/auth/login som starter Authorization Code + PKCE-flyten mot
  //      auth.tenki.no/oauth/authorize.
  //   b) Cookie-shared (legacy): hverken klient-ID eller andre OIDC-vars
  //      satt → send rett til auth.tenki.no/admin/login som før.
  //
  // Begge gir samme cookies på Domain=.tenki.no til slutt.
  if (!claims) {
    // Next.js standalone bak Cloudflare Tunnel rapporterer canonical URL
    // som "0.0.0.0:3000". Bygg ekte URL fra forwarded-headers så at
    // ?next=… peker tilbake til bench.tenki.no etter login.
    const host =
      req.headers.get("x-forwarded-host") ??
      req.headers.get("host") ??
      req.nextUrl.host;
    const proto =
      req.headers.get("x-forwarded-proto") ??
      req.nextUrl.protocol.replace(":", "");
    const fullUrl = `${proto}://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;
    const next = encodeURIComponent(fullUrl);
    if (process.env.TENKI_OIDC_CLIENT_ID) {
      const url = req.nextUrl.clone();
      url.pathname = "/api/auth/login";
      url.search = `?next=${next}`;
      return NextResponse.redirect(url, 302);
    }
    return NextResponse.redirect(`${ADMIN_LOGIN_URL}?next=${next}`, 302);
  }

  // Sesjon er gyldig — sjekk staff-rolle for /admin/*.
  if (!isStaff(claims)) {
    return new NextResponse(
      `Forbidden — denne kontoen (${claims.email ?? "ukjent"}) har ikke staff-rolle på Tenki. ` +
      `Spør super_admin om å gi deg 'employee' eller høyere på tenki.no.`,
      { status: 403 },
    );
  }

  return response;
}

// Force Node runtime — lib/tenki-sso.ts uses node:crypto for HS256 HMAC
// verification, which isn't available on the default Edge runtime.
export const config = {
  runtime: "nodejs",
  matcher: ["/admin/:path*"],
};
