-- TenkiBench v0.1 — initial schema
-- Idempotent: safe to re-run.

-- Categories of tests (faktura, kontrakt, …)
create table if not exists public.categories (
  id          serial primary key,
  slug        text unique not null,
  name        text not null,
  description text,
  weight      numeric(4,2) default 1.0,  -- weight in total leaderboard
  created_at  timestamptz default now()
);

-- Models we benchmark
create table if not exists public.models (
  id              serial primary key,
  slug            text unique not null,         -- e.g. "gpt-5", "claude-opus-4-7"
  display_name    text not null,                -- "GPT-5", "Claude Opus 4.7"
  provider        text not null,                -- "openai" | "anthropic" | "google" | "mistral" | "deepseek" | "mammouth" | "local" | ...
  provider_model  text not null,                -- exact ID sent in API request
  base_url        text,                         -- override (for Mammouth, local, etc.); null = provider default
  family          text,                         -- "gpt", "claude", "gemini", "llama", "mistral", "deepseek", "qwen", "gemma", ...
  parameter_count bigint,                       -- known param count, nullable
  is_open_weights boolean default false,
  is_active       boolean default true,         -- include in default run-all
  notes           text,
  added_at        timestamptz default now(),
  unique (provider, provider_model)
);

-- A single benchmark run = one model × one moment in time × one set of tasks
create table if not exists public.runs (
  id              serial primary key,
  model_id        integer not null references public.models(id) on delete cascade,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'pending', -- pending | running | finished | failed
  task_count      integer not null default 0,
  completed_count integer not null default 0,
  failed_count    integer not null default 0,
  bench_version   text not null,                 -- git commit short hash
  prompt_version  text not null,                 -- hash of system prompts used
  seed            integer,
  temperature     numeric(3,2) default 0.0,
  total_cost_usd  numeric(10,4) default 0,
  total_tokens_in bigint default 0,
  total_tokens_out bigint default 0,
  notes           text
);

create index if not exists runs_model_idx on public.runs(model_id, started_at desc);
create index if not exists runs_status_idx on public.runs(status);

-- One row per task per run
create table if not exists public.task_results (
  id              bigserial primary key,
  run_id          integer not null references public.runs(id) on delete cascade,
  task_id         text not null,                 -- file-derived id like "faktura-001"
  category_slug   text not null references public.categories(slug),
  raw_output      text,                          -- exact model output
  parsed_answer   text,                          -- extracted answer post-parsing
  gold_answer     text,                          -- gold for reference
  eval_method     text not null,                 -- "numeric_exact" | "regex" | "json_schema" | "llm_judge"
  score           numeric(4,3) not null,         -- 0.000–1.000
  judge_model_id  integer references public.models(id),
  judge_rubric    jsonb,                         -- structured rubric scoring (when llm_judge)
  judge_rationale text,                          -- judge's free-text explanation
  latency_ms      integer,
  tokens_in       integer,
  tokens_out      integer,
  cost_usd        numeric(10,6),
  error           text,                          -- if invocation failed
  created_at      timestamptz default now()
);

create index if not exists task_results_run_idx on public.task_results(run_id);
create index if not exists task_results_category_idx on public.task_results(category_slug, score desc);
create index if not exists task_results_task_idx on public.task_results(task_id);

-- Aggregate scores per (run, category) — materialized on run-finish, not a view
create table if not exists public.run_category_scores (
  run_id          integer not null references public.runs(id) on delete cascade,
  category_slug   text not null references public.categories(slug),
  task_count      integer not null,
  mean_score      numeric(4,3) not null,
  median_score    numeric(4,3) not null,
  primary key (run_id, category_slug)
);

-- Aggregate score per run (the top-line leaderboard number)
create table if not exists public.run_total_scores (
  run_id        integer primary key references public.runs(id) on delete cascade,
  total_score   numeric(4,3) not null,           -- weighted average across categories
  category_count integer not null,
  computed_at   timestamptz default now()
);

-- Judge calibration: how well does our LLM-judge agree with humans?
create table if not exists public.judge_calibration (
  id              serial primary key,
  judge_model_id  integer not null references public.models(id),
  task_id         text not null,
  human_score     numeric(4,3) not null,
  judge_score     numeric(4,3) not null,
  delta           numeric(5,3) generated always as (judge_score - human_score) stored,
  rated_by        text,
  rated_at        timestamptz default now()
);

-- Track external partners who validated tasks
create table if not exists public.task_validations (
  id            serial primary key,
  task_id       text not null,
  validator     text not null,        -- name of partner / firm / individual
  validator_role text,                 -- "advokat" | "regnskapsfører" | "HR-rådgiver" | …
  status        text not null,        -- "approved" | "rejected" | "needs-revision"
  comments      text,
  validated_at  timestamptz default now()
);

create index if not exists task_validations_task_idx on public.task_validations(task_id);

-- Seed categories
insert into public.categories (slug, name, description, weight) values
  ('faktura',        'Faktura-tolkning',          'Norske fakturaer: total, MVA, KID, forfall, utsteder', 1.0),
  ('kontrakt',       'Kontrakts-analyse',          'NDA, leveranseavtaler, arbeidsavtaler — finn risikable klausuler', 1.5),
  ('mva-skatt',      'MVA og skatt',               'MVA-beregning, fradrags-spørsmål, skatteplikt', 1.2),
  ('lov-referanse',  'Lov-referanse',              'Sitering av norsk lovgivning (Lovdata-fasit)', 1.3),
  ('brreg',          'Brønnøysund-data',           'Org-data, signatur, roller', 0.8),
  ('hr-lonn',        'HR og lønn',                 'Arbeidstid, sykepenger, ferie, oppsigelse', 1.0),
  ('kundeservice',   'Kundeservice (Bokmål)',      'Høflighet, klarhet, nøyaktighet i Bokmål kundeservice-svar', 0.7),
  ('bokmal-nynorsk', 'Bokmål↔Nynorsk',             'Toveis oversettelse + bevaring av juridisk presisjon', 0.5)
on conflict (slug) do nothing;

-- Seed-modeller. Lokal Gemma er aktiv fra dag 1 (krever ingen ekstern API-kost).
-- Mammouth-baserte modeller seedes som is_active = false slik at de ikke
-- kjører i run-all før du har lagt til MAMMOUTH_API_KEY og aktivert dem
-- manuelt fra /admin/modeller. Direkte provider-nøkler (OPENAI_API_KEY, etc.)
-- kan også brukes — endre da provider-feltet via admin når nøkkelen er på plass.
insert into public.models (slug, display_name, provider, provider_model, base_url, family, is_open_weights, is_active, notes) values
  ('gemma-3-4b-local',         'Gemma 3 4B (lokal)',      'local',    'mlx-community/gemma-3-4b-it-4bit', 'https://mlx.tenki.no/v1', 'gemma', true,  true,  'Tenki Mac Mini, mlx_lm.server — gratis å kjøre'),
  ('gpt-5',                    'GPT-5',                   'mammouth', 'gpt-5',                    'https://api.mammouth.ai/v1', 'gpt',     false, false, 'Via Mammouth gateway — aktiveres når MAMMOUTH_API_KEY er satt'),
  ('gpt-5-mini',               'GPT-5 mini',              'mammouth', 'gpt-5-mini',               'https://api.mammouth.ai/v1', 'gpt',     false, false, 'Via Mammouth gateway — aktiveres når MAMMOUTH_API_KEY er satt'),
  ('claude-opus-4-7',          'Claude Opus 4.7',         'mammouth', 'claude-opus-4-7',          'https://api.mammouth.ai/v1', 'claude',  false, false, 'Via Mammouth gateway — aktiveres når MAMMOUTH_API_KEY er satt'),
  ('claude-sonnet-4-6',        'Claude Sonnet 4.6',       'mammouth', 'claude-sonnet-4-6',        'https://api.mammouth.ai/v1', 'claude',  false, false, 'Via Mammouth gateway — aktiveres når MAMMOUTH_API_KEY er satt'),
  ('gemini-3-pro',             'Gemini 3 Pro',            'mammouth', 'gemini-3-pro',             'https://api.mammouth.ai/v1', 'gemini',  false, false, 'Via Mammouth gateway — aktiveres når MAMMOUTH_API_KEY er satt'),
  ('mistral-large-3',          'Mistral Large 3',         'mammouth', 'mistral-large-3',          'https://api.mammouth.ai/v1', 'mistral', false, false, 'Via Mammouth gateway — aktiveres når MAMMOUTH_API_KEY er satt'),
  ('deepseek-v3-1',            'DeepSeek V3.1',           'mammouth', 'deepseek-v3-1',            'https://api.mammouth.ai/v1', 'deepseek',true,  false, 'Via Mammouth gateway — aktiveres når MAMMOUTH_API_KEY er satt'),
  ('grok-4',                   'Grok 4',                  'mammouth', 'grok-4',                   'https://api.mammouth.ai/v1', 'grok',    false, false, 'Via Mammouth gateway — aktiveres når MAMMOUTH_API_KEY er satt'),
  ('qwen-3-72b',               'Qwen 3 72B',              'mammouth', 'qwen-3-72b',               'https://api.mammouth.ai/v1', 'qwen',    true,  false, 'Via Mammouth gateway — aktiveres når MAMMOUTH_API_KEY er satt'),
  ('llama-3-3-70b',            'Llama 3.3 70B',           'mammouth', 'llama-3-3-70b',            'https://api.mammouth.ai/v1', 'llama',   true,  false, 'Via Mammouth gateway — aktiveres når MAMMOUTH_API_KEY er satt')
on conflict (provider, provider_model) do nothing;
