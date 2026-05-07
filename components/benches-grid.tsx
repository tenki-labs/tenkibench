"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/card";

interface Bench {
  slug: string;
  name: string;
  description: string;
  category_count: number;
  task_count: number;
}

export function BenchesGrid({ benches }: { benches: Bench[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "planlagt">("all");
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const filtered = useMemo(() => {
    return benches.filter((b) => {
      if (deferred) {
        const hay = `${b.slug} ${b.name} ${b.description}`.toLowerCase();
        if (!hay.includes(deferred)) return false;
      }
      if (filter === "live" && b.task_count === 0) return false;
      if (filter === "planlagt" && b.task_count > 0) return false;
      return true;
    });
  }, [benches, deferred, filter]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk bench..."
          className="border hairline border-[var(--tenki-subtle)] px-3 py-2 bg-white flex-1 min-w-[200px]"
        />
        <div className="flex gap-2">
          {(["all", "live", "planlagt"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "border hairline px-3 py-2 text-sm " +
                (filter === f
                  ? "border-[var(--tenki-ink)] bg-white"
                  : "border-[var(--tenki-subtle)] text-[var(--tenki-muted)]")
              }
            >
              {f === "all" ? "Alle" : f === "live" ? "Live" : "Planlagt"}
            </button>
          ))}
        </div>
        <span className="eyebrow text-[var(--tenki-muted)]">
          {filtered.length} av {benches.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="border hairline border-[var(--tenki-subtle)] bg-white p-6 text-center text-sm text-[var(--tenki-muted)]">
          Ingen treff.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <Link key={b.slug} href={`/benches/${b.slug}`}>
              <Card className="hover:accent-strip transition-shadow h-full">
                <CardEyebrow>
                  {b.task_count > 0
                    ? `${b.task_count} oppgaver · ${b.category_count} kategorier`
                    : `${b.category_count} kategorier · planlagt`}
                </CardEyebrow>
                <CardTitle>{b.name}</CardTitle>
                <p className="mt-2 text-sm text-[var(--tenki-muted)]">{b.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
