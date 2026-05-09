-- TenkiBench v0.7 — system_settings tabell for kill-switches og runtime-konfig.
-- Brukes blant annet av cron-ruta for eksterne-scores (auto-refresh av/på).

create table if not exists public.system_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Seed: auto-refresh på som standard.
insert into public.system_settings (key, value, updated_by)
  values ('external_scores_auto_refresh_enabled', 'true'::jsonb, 'system')
  on conflict (key) do nothing;
