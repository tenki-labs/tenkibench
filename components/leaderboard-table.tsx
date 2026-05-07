"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { formatScore, formatCost, formatDate } from "@/lib/utils";

interface Row {
  model_id: number;
  model_slug: string;
  display_name: string;
  family: string | null;
  is_open_weights: boolean;
  total_score: string;
  total_cost_usd?: string;
  finished_at: string;
}

export function LeaderboardTable({
  rows,
  showCost = true,
}: {
  rows: Row[];
  showCost?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [familyFilter, setFamilyFilter] = useState<string | "all">("all");
  const [openOnly, setOpenOnly] = useState(false);
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const families = useMemo(
    () => Array.from(new Set(rows.map((r) => r.family).filter(Boolean))) as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (deferred) {
        const hay = `${r.display_name} ${r.model_slug} ${r.family ?? ""}`.toLowerCase();
        if (!hay.includes(deferred)) return false;
      }
      if (familyFilter !== "all" && r.family !== familyFilter) return false;
      if (openOnly && !r.is_open_weights) return false;
      return true;
    });
  }, [rows, deferred, familyFilter, openOnly]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk modell..."
          className="tenki-input tenki-input-sm flex-1 min-w-[220px]"
        />
        <select
          value={familyFilter}
          onChange={(e) => setFamilyFilter(e.target.value)}
          className="tenki-input tenki-input-sm w-auto"
        >
          <option value="all">Alle familier</option>
          {families.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 cursor-pointer text-tenki-ink">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.target.checked)}
            className="h-4 w-4 rounded border-tenki-subtle accent-tenki-accent"
          />
          Kun åpne vekter
        </label>
        <span className="font-mono text-[10px] uppercase tracking-eyebrow text-tenki-muted ml-auto">
          {filtered.length} av {rows.length}
        </span>
      </div>

      <div className="rounded-xl border border-tenki-subtle bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
              <th className="px-4 py-3 eyebrow">#</th>
              <th className="px-4 py-3 eyebrow">Modell</th>
              <th className="px-4 py-3 eyebrow">Familie</th>
              <th className="px-4 py-3 eyebrow">Vekter</th>
              <th className="px-4 py-3 eyebrow text-right">Score</th>
              {showCost && <th className="px-4 py-3 eyebrow text-right">Kostnad</th>}
              <th className="px-4 py-3 eyebrow text-right">Kjørt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={showCost ? 7 : 6} className="px-4 py-8 text-center text-[var(--tenki-muted)]">
                  Ingen treff.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={r.model_id}
                  className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-[var(--tenki-muted)]">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/modell/${r.model_slug}`} className="font-medium">
                      {r.display_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--tenki-muted)]">{r.family ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--tenki-muted)]">
                    {r.is_open_weights ? "Åpen" : "Lukket"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatScore(r.total_score)}</td>
                  {showCost && (
                    <td className="px-4 py-3 text-right text-[var(--tenki-muted)]">
                      {formatCost(r.total_cost_usd)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-[var(--tenki-muted)] text-xs">
                    {formatDate(r.finished_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
