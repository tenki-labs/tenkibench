-- TenkiBench v0.5 — knowledge vs reasoning kategorier
-- Hver kategori er enten "knowledge" (faktagjenkjenning, regel-anvendelse) eller
-- "reasoning" (flertrinns slutninger, motsetninger, kausalitet) innen samme
-- domene. Score-aggregat splittes deretter.
--
-- NB: categories.slug er globalt unik (fra 0001, FKs avhenger av den), så
-- reasoning-kategoriene må ha bench-prefiksede slugs.

alter table public.categories
  add column if not exists kind text not null default 'knowledge'
  check (kind in ('knowledge', 'reasoning'));

create index if not exists categories_kind_idx on public.categories (kind);

-- Reasoning-kategorier per bench. Slug = "<bench-prefix>-reasoning" for å
-- unngå kollisjon med globalt slug-unique.
insert into public.categories (bench_slug, slug, name, description, weight, kind) values
  ('norwegian-smb',          'smb-reasoning',     'Resonnering (SMB)',          'Flertrinns-slutninger og kausalitet i norsk SMB-kontekst',        1.4, 'reasoning'),
  ('eu-ai-act',              'aiact-reasoning',   'Resonnering (AI Act)',       'Anvendelse av AI Act-prinsipper på nye scenarier',                1.4, 'reasoning'),
  ('hallucination',          'hall-reasoning',    'Resonnering (hallusisjon)',  'Identifisere når et premiss er feil og resonnere fra det',        1.5, 'reasoning'),
  ('extraction',             'extr-reasoning',    'Resonnering (ekstraksjon)',  'Inferens fra strukturerte data — ikke bare ekstraksjon',          1.2, 'reasoning'),
  ('tool-use',               'tool-reasoning',    'Resonnering (verktøy)',      'Velge riktig sekvens av verktøy for nye oppgaver',                1.3, 'reasoning'),
  ('norwegian-language',     'lang-reasoning',    'Resonnering (språk)',        'Logisk konsistens i norsk tekst, identifisere implikasjoner',     1.2, 'reasoning'),
  ('norwegian-construction', 'bygg-reasoning',    'Resonnering (bygg)',         'Anvende NS-standard-prinsipper på ukjente bygg-saker',            1.4, 'reasoning'),
  ('norwegian-healthcare',   'helse-reasoning',   'Resonnering (helse)',        'Vurdere etiske/juridiske grenser i nye pasientsaker',             1.5, 'reasoning'),
  ('norwegian-finance',      'fin-reasoning',     'Resonnering (finans)',       'Analysere risikoeksponering og finansiell kausalitet',            1.4, 'reasoning'),
  ('gdpr-advanced',          'gdpr-reasoning',    'Resonnering (GDPR)',         'Anvende GDPR-prinsipper på edge-cases',                           1.5, 'reasoning'),
  ('safety-norwegian',       'safety-reasoning',  'Resonnering (safety)',       'Vurdere konsekvenser av handlinger i flertrinns-scenarier',       1.3, 'reasoning')
on conflict (slug) do update set
  description = excluded.description,
  weight = excluded.weight,
  kind = excluded.kind;
