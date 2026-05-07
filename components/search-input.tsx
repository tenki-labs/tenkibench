"use client";

import { useState, useDeferredValue, useMemo, type ReactNode } from "react";

/**
 * Generic client-side search-and-filter wrapper.
 *
 * Caller passes `items` and a `match(item, query)` predicate.
 * SearchableList renders an input + the filtered list, recomputed on each
 * keystroke (deferred via useDeferredValue so UI stays snappy on big lists).
 *
 * Usage:
 *   <SearchableList
 *     items={models}
 *     match={(m, q) => m.display_name.toLowerCase().includes(q)}
 *     placeholder="Søk modell..."
 *     render={(m) => <Row key={m.id} {...m} />}
 *   />
 */
export function SearchableList<T>({
  items,
  match,
  render,
  placeholder = "Søk...",
  emptyMessage = "Ingen treff.",
}: {
  items: T[];
  match: (item: T, query: string) => boolean;
  render: (item: T, idx: number) => ReactNode;
  placeholder?: string;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const filtered = useMemo(() => {
    if (!deferred) return items;
    return items.filter((item) => match(item, deferred));
  }, [items, deferred, match]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full sm:max-w-md tenki-input text-sm"
        />
        {deferred && (
          <span className="eyebrow text-[var(--tenki-muted)] whitespace-nowrap">
            {filtered.length} av {items.length}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-tenki-subtle bg-white overflow-hidden p-6 text-center text-sm text-[var(--tenki-muted)]">
          {emptyMessage}
        </div>
      ) : (
        <>{filtered.map((item, i) => render(item, i))}</>
      )}
    </div>
  );
}
