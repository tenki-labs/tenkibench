import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifyTenkiJwt, isStaff } from "@/lib/tenki-sso";

/**
 * Bench har ikke egen login. Tenki SSO på auth.tenki.no håndterer all auth.
 *
 * To moduser:
 *   - OIDC: TENKI_OIDC_CLIENT_ID satt → redirect til /api/auth/login som
 *     starter Authorization Code + PKCE-flyten
 *   - Cookie-shared (legacy): redirect rett til auth.tenki.no/admin/login
 *
 * Hvis brukeren ALLEREDE har gyldig staff-cookie hopper vi rett til target
 * uten å starte en ny SSO-runde — ellers ender vi i en loop etter en
 * vellykket OIDC-callback der `next` peker tilbake til /admin/login.
 */
export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (secret) {
    const store = await cookies();
    const access = store.get(SESSION_COOKIE)?.value;
    const claims = verifyTenkiJwt(access, secret);
    if (claims && isStaff(claims)) {
      redirect(safeNextOrAdmin(next));
    }
  }

  const back = isSafeBack(next) ? (next as string) : "https://bench.tenki.no/admin";

  if (process.env.TENKI_OIDC_CLIENT_ID) {
    redirect(`/api/auth/login?next=${encodeURIComponent(back)}`);
  }
  redirect(`https://auth.tenki.no/admin/login?next=${encodeURIComponent(back)}`);
}

function safeNextOrAdmin(next: string | undefined): string {
  if (!next) return "/admin";
  if (next === "/admin/login" || next.startsWith("/admin/login?")) return "/admin";
  if (next.startsWith("/admin")) return next;
  try {
    const url = new URL(next);
    if (
      url.hostname === "bench.tenki.no" &&
      url.pathname.startsWith("/admin") &&
      !url.pathname.startsWith("/admin/login")
    ) {
      return url.toString();
    }
  } catch {
    /* fall through */
  }
  return "/admin";
}

function isSafeBack(next: string | undefined): boolean {
  if (!next) return false;
  if (next.startsWith("/")) return true;
  try {
    const url = new URL(next);
    return url.hostname === "bench.tenki.no" || url.hostname.endsWith(".tenki.no");
  } catch {
    return false;
  }
}
