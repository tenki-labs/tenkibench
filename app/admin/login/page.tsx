import { redirect } from "next/navigation";

/**
 * Bench har ikke egen login. Tenki SSO på auth.tenki.no håndterer all auth.
 *
 * To moduser:
 *   - OIDC: TENKI_OIDC_CLIENT_ID satt → redirect til /api/auth/login som
 *     starter Authorization Code + PKCE-flyten
 *   - Cookie-shared (legacy): redirect rett til auth.tenki.no/admin/login
 */
export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const back = next ?? "https://bench.tenki.no/admin";

  if (process.env.TENKI_OIDC_CLIENT_ID) {
    redirect(`/api/auth/login?next=${encodeURIComponent(back)}`);
  }
  redirect(`https://auth.tenki.no/admin/login?next=${encodeURIComponent(back)}`);
}
