import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border border-tenki-subtle bg-white p-6 card-lift",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "font-sans text-xl font-medium tracking-tight text-tenki-ink",
        className,
      )}
      {...props}
    />
  );
}

export function CardEyebrow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted mb-2",
        className,
      )}
      {...props}
    />
  );
}
