import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EyebrowProps {
  /** Prepend a `·` punctuation prefix (default true). */
  dot?: boolean;
  /** Render in accent color instead of muted. */
  accent?: boolean;
  /** Wrap content in `[ ]` brackets like `[ Bench · v0.3 ]` (default false). */
  brackets?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Speiler tenki.no sin Eyebrow-komponent: DM Mono, 11px, uppercase,
 * letter-spacing 0.18em, valgfri prikk-prefix og bracket-wrapper.
 */
export function Eyebrow({
  dot = true,
  accent = false,
  brackets = false,
  className = "",
  children,
}: EyebrowProps) {
  const color = accent ? "text-tenki-accent" : "text-tenki-muted";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[10px] md:text-[11px] font-medium uppercase tracking-eyebrow",
        color,
        className,
      )}
    >
      {brackets ? (
        <>
          <span aria-hidden>[</span>
          {children}
          <span aria-hidden>]</span>
        </>
      ) : (
        <>
          {dot && <span aria-hidden>·</span>}
          {children}
        </>
      )}
    </span>
  );
}
