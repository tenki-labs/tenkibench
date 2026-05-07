-- TenkiBench v0.6 — split run_total_scores i knowledge_score + reasoning_score
-- Hver kjøring får nå tre tall: totalt, knowledge-bare, reasoning-bare.
-- Total beholdes som vektet snitt over ALLE kategorier (begge kinds).

alter table public.run_total_scores
  add column if not exists knowledge_score numeric(4,3),
  add column if not exists reasoning_score numeric(4,3),
  add column if not exists knowledge_count integer,
  add column if not exists reasoning_count integer;

-- Indeks for raske leaderboard-queries på reasoning specifikt
create index if not exists run_total_scores_reasoning_idx
  on public.run_total_scores (reasoning_score desc nulls last)
  where reasoning_score is not null;
