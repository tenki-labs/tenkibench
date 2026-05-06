import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-6 py-24">
        <div className="eyebrow mb-3">404</div>
        <h1 className="h1 mb-4">Fant ikke siden</h1>
        <p className="text-[var(--tenki-muted)] mb-6">
          Lenken du fulgte er gammel eller feil. Prøv leaderboardet eller oppgave-katalogen.
        </p>
        <div className="flex gap-4 text-sm">
          <Link href="/leaderboard" className="border hairline border-[var(--tenki-ink)] px-4 py-2">Til leaderboard</Link>
          <Link href="/oppgaver" className="px-4 py-2">Til oppgaver</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
