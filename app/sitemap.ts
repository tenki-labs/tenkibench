import type { MetadataRoute } from "next";
import { loadAllTasks } from "@/lib/tasks/loader";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bench.tenki.no";
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    "",
    "/leaderboard",
    "/kategorier",
    "/oppgaver",
    "/metodikk",
    "/om",
  ].map((p) => ({ url: base + p, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 }));

  let tasks: { id: string; category: string }[] = [];
  try {
    tasks = loadAllTasks().map((t) => ({ id: t.id, category: t.category }));
  } catch {}

  const taskUrls: MetadataRoute.Sitemap = tasks.map((t) => ({
    url: `${base}/oppgaver/${t.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const categories = Array.from(new Set(tasks.map((t) => t.category)));
  const categoryUrls: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/kategorier/${c}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticUrls, ...categoryUrls, ...taskUrls];
}
