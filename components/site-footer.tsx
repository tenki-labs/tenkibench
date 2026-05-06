import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t hairline border-t-[var(--tenki-subtle)] mt-24">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row gap-4 sm:items-center justify-between text-sm text-[var(--tenki-muted)]">
        <div>
          <span className="eyebrow">TenkiBench v0.1</span>
          <span className="ml-3">
            Drevet av <Link href="https://tenki.no">Tenki Labs AS</Link>
          </span>
        </div>
        <div className="flex gap-6">
          <Link href="/metodikk">Metodikk</Link>
          <Link href="/api/public/leaderboard">Public API</Link>
          <Link href="https://github.com/tenki-labs/tenkibench">GitHub</Link>
          <Link href="mailto:einar@tenki.no">Kontakt</Link>
        </div>
      </div>
    </footer>
  );
}
