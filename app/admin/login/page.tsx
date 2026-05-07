import { redirect } from "next/navigation";

/**
 * Bench har ikke egen login. Tenki SSO på auth.tenki.no håndterer all auth.
 * Hvis noen treffer /admin/login direkte, send dem rett til central auth med
 * riktig redirect-tilbake.
 */
export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const back = next ?? "https://bench.tenki.no/admin";
  redirect(`https://auth.tenki.no/admin/login?next=${encodeURIComponent(back)}`);
}
