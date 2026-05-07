import { cn } from "@/lib/utils";

type Kind = "good" | "warn" | "bad" | "muted" | "accent";

const colors: Record<Kind, string> = {
  good:   "bg-tenki-good",
  warn:   "bg-tenki-warn",
  bad:    "bg-tenki-bad",
  muted:  "bg-tenki-muted",
  accent: "bg-tenki-accent",
};

/**
 * Liten farget prikk for å markere status — speiler tenki.no.
 */
export function StatusDot({
  kind = "muted",
  className,
}: {
  kind?: Kind;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
        colors[kind],
        className,
      )}
    />
  );
}
