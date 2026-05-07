import Link from "next/link";

const nav = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/sammenlign",  label: "Sammenlign" },
  { href: "/benches",     label: "Benches" },
  { href: "/oppgaver",    label: "Oppgaver" },
  { href: "/metodikk",    label: "Metodikk" },
  { href: "/om",          label: "Om" },
] as const;

const apiLinks = [
  { href: "/api/public/leaderboard", label: "Leaderboard JSON" },
  { href: "https://github.com/tenki-labs/tenkibench", label: "GitHub" },
  { href: "https://github.com/tenki-labs/tenkibench/blob/main/docs/TESTING_METHODOLOGY.md", label: "Metodikk-doc" },
  { href: "https://github.com/tenki-labs/tenkibench/blob/main/docs/PARTNERS.md", label: "Partner-program" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-tenki-ink text-stone-300 mt-32">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-24 grid gap-12 md:grid-cols-4">
        {/* Brand-kolonne */}
        <div className="md:col-span-1">
          <Link
            href="/"
            className="inline-flex items-baseline gap-2 text-stone-50"
            aria-label="TenkiBench, forside"
          >
            <img
              src="/tenki-mark.svg"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 invert self-center"
            />
            <span className="font-mono text-3xl font-medium tracking-tight leading-none">
              tenki
            </span>
            <span className="font-mono text-sm font-medium uppercase tracking-eyebrow text-tenki-accent self-center">
              / bench
            </span>
          </Link>
          <p className="mt-6 text-sm leading-relaxed text-stone-400 max-w-xs">
            Åpen, uavhengig benchmark for hvor godt språkmodeller fungerer på
            norske SMB-oppgaver. Drevet av Tenki Labs AS.
          </p>
          <p className="mt-6 font-mono text-xs uppercase tracking-eyebrow text-stone-500">
            v0.3 · {year}
          </p>
        </div>

        <nav aria-label="Navigasjon" className="flex flex-col gap-3">
          <h3 className="font-mono text-xs uppercase tracking-eyebrow text-stone-500 mb-2">
            Navigasjon
          </h3>
          {nav.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="link-underline text-sm text-stone-300 hover:text-tenki-accent transition"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Ressurser" className="flex flex-col gap-3">
          <h3 className="font-mono text-xs uppercase tracking-eyebrow text-stone-500 mb-2">
            Ressurser
          </h3>
          {apiLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="link-underline text-sm text-stone-300 hover:text-tenki-accent transition"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-xs uppercase tracking-eyebrow text-stone-500 mb-2">
            Kontakt
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-stone-500">
            · Skriv til oss
          </span>
          <a
            href="mailto:einar@tenki.no"
            className="link-underline font-sans font-medium text-base md:text-lg text-stone-50 hover:text-tenki-accent transition"
          >
            einar@tenki.no
          </a>
          <span className="text-sm text-stone-400">Oslo, Norge</span>

          <h3 className="font-mono text-xs uppercase tracking-eyebrow text-stone-500 mt-6 mb-2">
            Hovedside
          </h3>
          <Link
            href="https://tenki.no"
            className="link-underline text-sm text-stone-300 hover:text-tenki-accent transition"
          >
            tenki.no
          </Link>
        </div>
      </div>

      <div className="border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs text-stone-500">
          <span>
            © {year} Tenki Labs AS. Oppgaver: CC BY 4.0. Kode: MIT.
          </span>
          <div className="flex items-center gap-6">
            <span>Norge</span>
            <Link
              href="/admin/login"
              className="link-underline hover:text-tenki-accent transition"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
