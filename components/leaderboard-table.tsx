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
  knowledge_score?: string | null;
  reasoning_score?: string | null;
  total_cost_usd?: string;
  finished_at: string;
}

type SortKey = "total" | "knowledge" | "reasoning";

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
  const [sortBy, setSortBy] = useState<SortKey>("total");
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const families = useMemo(
    () => Array.from(new Set(rows.map((r) => r.family).filter(Boolean))) as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    const out = rows.filter((r) => {
      if (deferred) {
        const hay = `${r.display_name} ${r.model_slug} ${r.family ?? ""}`.toLowerCase();
        if (!hay.includes(deferred)) return false;
      }
      if (familyFilter !== "all" && r.family !== familyFilter) return false;
      if (openOnly && !r.is_open_weights) return false;
      return true;
    });
    const key = sortBy === "knowledge" ? "knowledge_score"
              : sortBy === "reasoning" ? "reasoning_score"
              : "total_score";
    return [...out].sort((a, b) => {
      const av = Number(a[key as keyof Row] ?? -1);
      const bv = Number(b[key as keyof Row] ?? -1);
      return bv - av;
    });
  }, [rows, deferred, familyFilter, openOnly, sortBy]);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => setSortBy(k)}
      className={
        "inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-eyebrow " +
        (sortBy === k ? "text-tenki-accent" : "text-tenki-muted hover:text-tenki-ink")
      }
    >
      {label}
      {sortBy === k && <span aria-hidden>↓</span>}
    </button>
  );

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
            <tr className="border-b border-tenki-subtle text-left">
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">#</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Modell</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted hidden md:table-cell">Familie</th>
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted hidden lg:table-cell">Vekter</th>
              <th className="px-4 py-3 text-right"><SortHeader label="Total" k="total" /></th>
              <th className="px-4 py-3 text-right"><SortHeader label="Knowledge" k="knowledge" /></th>
              <th className="px-4 py-3 text-right"><SortHeader label="Reasoning" k="reasoning" /></th>
              {showCost && <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right hidden lg:table-cell">Kostnad</th>}
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right hidden md:table-cell">Kjørt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={showCost ? 9 : 8} className="px-4 py-8 text-center text-tenki-muted">
                  Ingen treff.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={r.model_id}
                  className="border-b border-tenki-subtle last:border-0 hover:bg-tenki-surface/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-tenki-muted">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/modell/${r.model_slug}`} className="link-underline font-medium">
                      {r.display_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-tenki-muted hidden md:table-cell">{r.family ?? "—"}</td>
                  <td className="px-4 py-3 text-tenki-muted text-xs hidden lg:table-cell">
                    {r.is_open_weights ? "Åpen" : "Lukket"}
                  </td>
                  <td className={"px-4 py-3 text-right font-mono " + (sortBy === "total" ? "font-medium" : "")}>
                    {formatScore(r.total_score)}
                  </td>
                  <td className={"px-4 py-3 text-right font-mono " + (sortBy === "knowledge" ? "font-medium" : "text-tenki-muted")}>
                    {formatScore(r.knowledge_score)}
                  </td>
                  <td className={"px-4 py-3 text-right font-mono " + (sortBy === "reasoning" ? "font-medium" : "text-tenki-muted")}>
                    {formatScore(r.reasoning_score)}
                  </td>
                  {showCost && (
                    <td className="px-4 py-3 text-right text-tenki-muted hidden lg:table-cell">
                      {formatCost(r.total_cost_usd)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-tenki-muted text-xs hidden md:table-cell">
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
