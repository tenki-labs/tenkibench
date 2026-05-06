import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b hairline border-b-[var(--tenki-subtle)]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-lg font-medium tracking-tight">TenkiBench</span>
          <span className="eyebrow hidden sm:inline">Norsk SMB-evaluering</span>
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/sammenlign">Sammenlign</Link>
          <Link href="/kategorier">Kategorier</Link>
          <Link href="/oppgaver">Oppgaver</Link>
          <Link href="/metodikk">Metodikk</Link>
          <Link href="/om">Om</Link>
        </nav>
      </div>
    </header>
  );
}
