import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  /** Eyebrow-tekst — DM Mono uppercase, vid tracking. Prikk-prefix legges på automatisk. */
  kicker?: string;
  /** Brackets rundt eyebrow: `[ Kicker ]` */
  bracketKicker?: boolean;
  /** Seksjons-tittel — DM Sans 500, stor. */
  heading?: ReactNode;
  /** Valgfri ledetekst. */
  lede?: ReactNode;
  /** Ekstra klasser på <section>. */
  className?: string;
  /** Ekstra klasser på inner-container. */
  innerClassName?: string;
  /** Override max-width — default `wide` (max-w-7xl). */
  container?: "narrow" | "wide";
  /** Optional id for hash-lenker. */
  id?: string;
  children?: ReactNode;
}

const maxByContainer = {
  narrow: "max-w-4xl",
  wide:   "max-w-7xl",
} as const;

/**
 * Editorial seksjon-wrapper — speiler tenki.no sin Section.
 * 24/40px horisontal pad, 96/112px vertikal pad, kicker + heading + lede.
 */
export function Section({
  kicker,
  bracketKicker = false,
  heading,
  lede,
  className,
  innerClassName,
  container = "wide",
  id,
  children,
}: SectionProps) {
  const max = maxByContainer[container];
  return (
    <section id={id} className={cn("py-24 md:py-28", className)}>
      <div className={cn(max, "mx-auto px-6 md:px-10", innerClassName)}>
        {(kicker || heading || lede) && (
          <header className="mb-12 md:mb-16 max-w-3xl">
            {kicker && (
              <p className="mb-6 font-mono text-[10px] md:text-[11px] font-medium uppercase tracking-eyebrow text-tenki-muted">
                {bracketKicker ? `[ ${kicker} ]` : `· ${kicker}`}
              </p>
            )}
            {heading && (
              <h2 className="font-sans font-medium text-4xl md:text-5xl leading-[1.05] tracking-[-0.025em] text-tenki-ink">
                {heading}
              </h2>
            )}
            {lede && (
              <p className="mt-6 text-base md:text-lg text-tenki-muted max-w-2xl leading-relaxed">
                {lede}
              </p>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
