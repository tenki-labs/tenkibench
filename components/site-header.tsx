"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu, X } from "lucide-react";

const links = [
  { href: "/leaderboard",  label: "Leaderboard" },
  { href: "/sammenlign",   label: "Sammenlign" },
  { href: "/benches",      label: "Benches" },
  { href: "/oppgaver",     label: "Oppgaver" },
  { href: "/metodikk",     label: "Metodikk" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  const headerBase =
    "fixed inset-x-0 top-0 z-40 bg-tenki-bg/80 backdrop-blur-md border-b transition-colors duration-300";
  const headerState = scrolled ? "border-tenki-subtle" : "border-transparent";

  return (
    <>
      <header className={`${headerBase} ${headerState}`}>
        {/* Mini topbar: tilbake til tenki.no */}
        <div className="border-b border-tenki-subtle/70 bg-tenki-surface/40">
          <div className="max-w-7xl mx-auto px-6 md:px-10 h-7 flex items-center justify-between text-[10px] font-mono uppercase tracking-eyebrow text-tenki-muted">
            <a
              href="https://tenki.no"
              className="inline-flex items-center gap-1.5 hover:text-tenki-accent transition-colors"
            >
              <ArrowLeft aria-hidden className="h-3 w-3" />
              Tilbake til tenki.no
            </a>
            <span className="hidden sm:inline-flex items-center gap-3">
              <span>v0.3</span>
              <span aria-hidden>·</span>
              <a
                href="https://github.com/tenki-labs/tenkibench"
                target="_blank"
                rel="noopener"
                className="hover:text-tenki-accent transition-colors"
              >
                GitHub ↗
              </a>
            </span>
          </div>
        </div>

        {/* Hovedlinje */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between py-5">
          <div className="inline-flex items-baseline gap-2 text-tenki-ink">
            <a
              href="https://tenki.no"
              className="group inline-flex items-baseline gap-2 hover:text-tenki-accent transition-colors"
              aria-label="Tilbake til tenki.no"
            >
              <img
                src="/tenki-mark.svg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 self-center transition-transform duration-500 ease-out group-hover:rotate-6"
              />
              <span className="font-mono text-3xl font-medium tracking-tight leading-none">
                tenki
              </span>
            </a>
            <span aria-hidden className="font-mono text-2xl text-tenki-subtle self-center select-none">/</span>
            <Link
              href="/"
              className="font-mono text-2xl font-medium tracking-tight leading-none text-tenki-accent self-center hover:opacity-80 transition-opacity"
              aria-label="TenkiBench forside"
            >
              bench
            </Link>
          </div>

          <nav aria-label="Hovedmeny" className="hidden md:flex items-center gap-7">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-tenki-ink hover:text-tenki-accent transition-colors duration-150"
              >
                {l.label}
              </Link>
            ))}
            <span className="h-4 w-px bg-tenki-subtle" aria-hidden />
            <Link
              href="/api/public/leaderboard"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-accent hover:underline underline-offset-4"
            >
              API <span aria-hidden>→</span>
            </Link>
          </nav>

          <button
            type="button"
            className="md:hidden text-tenki-ink"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Lukk meny" : "Åpne meny"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Spacer for fixed header (28px topbar + 72px hovedlinje ≈ 100px) */}
      <div aria-hidden className="h-[100px]" />

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-tenki-bg md:hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-5">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-baseline gap-2 text-tenki-ink"
            >
              <img src="/tenki-mark.svg" alt="" width={32} height={32} className="h-8 w-8 shrink-0 self-center" />
              <span className="font-mono text-3xl font-medium tracking-tight leading-none">tenki</span>
              <span className="font-mono text-3xl text-tenki-subtle">/</span>
              <span className="font-mono text-3xl font-medium leading-none text-tenki-accent">bench</span>
            </Link>
            <button type="button" aria-label="Lukk meny" onClick={() => setMenuOpen(false)} className="text-tenki-ink">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav aria-label="Mobilmeny" className="flex-1 flex flex-col justify-center gap-6 px-8">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="font-mono font-medium text-5xl tracking-tighter text-tenki-ink hover:text-tenki-accent transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <a
              href="https://tenki.no"
              className="mt-8 inline-flex items-center gap-3 self-start font-mono text-base uppercase tracking-eyebrow text-tenki-muted hover:text-tenki-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Tilbake til tenki.no
            </a>
          </nav>
        </div>
      )}
    </>
  );
}
