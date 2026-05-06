import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number | string | null | undefined): string {
  if (score == null) return "—";
  const n = typeof score === "string" ? Number(score) : score;
  if (!Number.isFinite(n)) return "—";
  return (n * 100).toFixed(1) + "%";
}

export function formatNumber(n: number | string | null | undefined): string {
  if (n == null) return "—";
  const x = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("nb-NO");
}

export function formatCost(usd: number | string | null | undefined): string {
  if (usd == null) return "—";
  const n = typeof usd === "string" ? Number(usd) : usd;
  if (!Number.isFinite(n)) return "—";
  return "$" + n.toFixed(4);
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("nb-NO", { year: "numeric", month: "short", day: "numeric" });
}
