import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border hairline border-[var(--tenki-subtle)] bg-white p-6",
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
  return <div className={cn("h2", className)} {...props} />;
}

export function CardEyebrow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("eyebrow mb-2", className)} {...props} />;
}
