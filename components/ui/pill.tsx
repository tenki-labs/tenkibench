import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost";

interface PillBaseProps {
  variant?: Variant;
  /** Append en pil for å signalisere "ut" / "videre". */
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}

interface PillLinkProps extends PillBaseProps {
  href: string;
  as?: "link";
  external?: boolean;
}

interface PillButtonProps extends PillBaseProps {
  as: "button";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}

type PillProps = PillLinkProps | PillButtonProps;

const base =
  "inline-flex items-center gap-2 rounded-full px-6 sm:px-7 py-3 sm:py-[14px] font-mono text-[11px] font-medium uppercase " +
  "tracking-[0.16em] transition-all duration-150 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-tenki-accent focus-visible:outline-offset-2";

const styles: Record<Variant, string> = {
  primary: "bg-tenki-ink text-tenki-bg hover:opacity-90 hover:scale-[1.02]",
  ghost:   "border border-tenki-subtle text-tenki-ink hover:border-tenki-ink",
};

/**
 * Editorial pill-CTA — speiler tenki.no sin Pill-komponent.
 * Rendrer `<Link>` som default, `<button>` ved `as="button"`,
 * eller en ekstern `<a>` ved `external`.
 */
export function Pill(props: PillProps) {
  const { variant = "primary", arrow = false, className = "", children } = props;
  const classes = cn(base, styles[variant], className);

  if (props.as === "button") {
    return (
      <button
        type={props.type ?? "button"}
        onClick={props.onClick}
        disabled={props.disabled}
        className={classes}
      >
        {children}
        {arrow && <ArrowUpRight aria-hidden className="h-4 w-4" />}
      </button>
    );
  }

  if (props.external || props.href.startsWith("http")) {
    return (
      <a href={props.href} className={classes} target="_blank" rel="noopener">
        {children}
        {arrow && <ArrowUpRight aria-hidden className="h-4 w-4" />}
      </a>
    );
  }

  return (
    <Link href={props.href} className={classes}>
      {children}
      {arrow && <ArrowUpRight aria-hidden className="h-4 w-4" />}
    </Link>
  );
}
