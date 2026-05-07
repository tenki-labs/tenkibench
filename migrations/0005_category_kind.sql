-- TenkiBench v0.5 — knowledge vs reasoning kategorier
-- Hver kategori er enten "knowledge" (faktagjenkjenning, regel-anvendelse) eller
-- "reasoning" (flertrinns slutninger, motsetninger, kausalitet) innen samme
-- domene. Score-aggregat splittes deretter.

alter table public.categories
  add column if not exists kind text not null default 'knowledge'
  check (kind in ('knowledge', 'reasoning'));

create index if not exists categories_kind_idx on public.categories (kind);

-- Eksisterende kategorier får 'knowledge' som default. Reasoning-kategorier
-- legges inn per bench under. Bare en startsett — fyll på senere.

insert into public.categories (bench_slug, slug, name, description, weight, kind) values
  ('norwegian-smb',     'reasoning',  'Resonnering',  'Flertrinns-slutninger, kontrafaktisk tenkning og kausalitet i norsk SMB-kontekst', 1.4, 'reasoning'),
  ('eu-ai-act',         'reasoning',  'Resonnering',  'Anvendelse av AI Act-prinsipper på nye scenarier',                               1.4, 'reasoning'),
  ('hallucination',     'reasoning',  'Resonnering',  'Identifisere når et premiss er feil og resonnere fra det',                       1.5, 'reasoning'),
  ('extraction',        'reasoning',  'Resonnering',  'Inferens fra strukturerte data — ikke bare ekstraksjon',                         1.2, 'reasoning'),
  ('tool-use',          'reasoning',  'Resonnering',  'Velge riktig sekvens av verktøy for nye oppgaver',                               1.3, 'reasoning'),
  ('norwegian-language','reasoning',  'Resonnering',  'Logisk konsistens i norsk tekst, identifisere implikasjoner',                    1.2, 'reasoning'),
  ('norwegian-construction','reasoning','Resonnering','Anvende NS-standard-prinsipper på ukjente bygg-saker',                           1.4, 'reasoning'),
  ('norwegian-healthcare','reasoning', 'Resonnering', 'Vurdere etiske/juridiske grenser i nye pasientsaker',                            1.5, 'reasoning'),
  ('norwegian-finance', 'reasoning',  'Resonnering',  'Analysere risikoeksponering og finansiell kausalitet',                           1.4, 'reasoning'),
  ('gdpr-advanced',     'reasoning',  'Resonnering',  'Anvende GDPR-prinsipper på edge-cases',                                          1.5, 'reasoning'),
  ('safety-norwegian',  'reasoning',  'Resonnering',  'Vurdere konsekvenser av handlinger i flertrinns-scenarier',                     1.3, 'reasoning')
on conflict (bench_slug, slug) do update set
  description = excluded.description,
  weight = excluded.weight,
  kind = excluded.kind;
