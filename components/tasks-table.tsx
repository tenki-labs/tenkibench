"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

interface TaskRow {
  id: string;
  bench: string;
  category: string;
  title: string;
  difficulty: string;
  eval_method: string;
}

export function TasksTable({ tasks }: { tasks: TaskRow[] }) {
  const [query, setQuery] = useState("");
  const [bench, setBench] = useState<"all" | string>("all");
  const [difficulty, setDifficulty] = useState<"all" | string>("all");
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const benches = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.bench))).sort(),
    [tasks],
  );

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (deferred) {
        const hay = `${t.id} ${t.title} ${t.category} ${t.bench}`.toLowerCase();
        if (!hay.includes(deferred)) return false;
      }
      if (bench !== "all" && t.bench !== bench) return false;
      if (difficulty !== "all" && t.difficulty !== difficulty) return false;
      return true;
    });
  }, [tasks, deferred, bench, difficulty]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk oppgave..."
          className="border hairline border-[var(--tenki-subtle)] px-3 py-2 bg-white flex-1 min-w-[200px]"
        />
        <select
          value={bench}
          onChange={(e) => setBench(e.target.value)}
          className="border hairline border-[var(--tenki-subtle)] px-3 py-2 bg-white"
        >
          <option value="all">Alle benches</option>
          {benches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="border hairline border-[var(--tenki-subtle)] px-3 py-2 bg-white"
        >
          <option value="all">Alle vansklighet</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
        </select>
        <span className="eyebrow text-[var(--tenki-muted)]">
          {filtered.length} av {tasks.length}
        </span>
      </div>

      <div className="border hairline border-[var(--tenki-subtle)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
              <th className="px-4 py-3 eyebrow">ID</th>
              <th className="px-4 py-3 eyebrow">Bench</th>
              <th className="px-4 py-3 eyebrow">Kategori</th>
              <th className="px-4 py-3 eyebrow">Tittel</th>
              <th className="px-4 py-3 eyebrow">Vansk.</th>
              <th className="px-4 py-3 eyebrow">Eval</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--tenki-muted)]">
                  Ingen treff.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/oppgaver/${t.id}`}>{t.id}</Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--tenki-muted)] text-xs">{t.bench}</td>
                  <td className="px-4 py-3 text-[var(--tenki-muted)]">{t.category}</td>
                  <td className="px-4 py-3">{t.title}</td>
                  <td className="px-4 py-3 text-[var(--tenki-muted)]">{t.difficulty}</td>
                  <td className="px-4 py-3 text-[var(--tenki-muted)] text-xs font-mono">
                    {t.eval_method}
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
