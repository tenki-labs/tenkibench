-- TenkiBench v0.4 — eksterne benchmark-scores per modell
-- Lagrer Artificial Analysis sin Intelligence Index + per-benchmark-tall,
-- LMArena Elo, og fremtidige kilder. Alt i JSONB for fleksibilitet.

-- 1) Eksterne IDer per modell. Mapper vår slug → kildens egen slug.
--    Eksempel: { "artificial_analysis": "claude-opus-4-7", "lmarena": "Claude Opus 4.7" }
alter table public.models
  add column if not exists external_ids jsonb not null default '{}'::jsonb;

-- 2) Den faktiske scoringen fra eksterne kilder. Strukturert per kilde-slug.
--    Eksempel:
--    {
--      "artificial_analysis": {
--        "fetched_at": "2026-05-08T10:00:00Z",
--        "intelligence_index": 71,
--        "coding_index": 68,
--        "math_index": 79,
--        "scores": {
--          "mmlu_pro": 0.748,
--          "gpqa_diamond": 0.521,
--          "humaneval": 0.892,
--          "math_500": 0.793,
--          "aime": 0.42,
--          "livecodebench": 0.685,
--          "scicode": 0.34
--        },
--        "performance": {
--          "median_output_tps": 87,
--          "time_to_first_token_s": 0.58
--        },
--        "pricing": {
--          "input_per_1m_usd": 5.0,
--          "output_per_1m_usd": 15.0,
--          "blended_per_1m_usd": 8.0
--        }
--      },
--      "lmarena": {
--        "fetched_at": "2026-05-08T10:00:00Z",
--        "elo": 1287,
--        "votes": 125000,
--        "rank": 5
--      }
--    }
alter table public.models
  add column if not exists external_scores jsonb not null default '{}'::jsonb;

-- 3) Sist oppdatert (per modell, ikke per kilde).
alter table public.models
  add column if not exists external_scores_updated_at timestamptz;

-- 4) Indeks for spørringer mot Intelligence Index på leaderboard.
create index if not exists models_intelligence_index_idx
  on public.models (((external_scores -> 'artificial_analysis' ->> 'intelligence_index')::int))
  where external_scores ? 'artificial_analysis';

-- 5) Logg av refresh-runs så vi kan se historikk + feil.
create table if not exists public.external_score_refreshes (
  id           bigserial primary key,
  source       text not null,                  -- 'artificial_analysis', 'lmarena', 'manual', ...
  started_at   timestamptz default now(),
  finished_at  timestamptz,
  status       text default 'running',         -- 'running' | 'finished' | 'failed'
  models_updated integer default 0,
  models_skipped integer default 0,
  error        text
);

create index if not exists external_score_refreshes_started_idx
  on public.external_score_refreshes (started_at desc);

-- 6) Forhåndssett external_ids for kjente modeller. Slug-matching skal stort
--    sett virke direkte, men vi setter eksplisitt der det avviker.
update public.models set external_ids = jsonb_build_object('artificial_analysis', slug)
  where slug in (
    'gpt-5', 'gpt-5-mini', 'claude-opus-4-7', 'claude-sonnet-4-6',
    'gemini-3-pro', 'mistral-large-3', 'deepseek-v3-1', 'grok-4',
    'qwen-3-72b', 'llama-3-3-70b'
  ) and not (external_ids ? 'artificial_analysis');
