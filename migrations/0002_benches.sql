-- TenkiBench v0.2 — multi-bench support
-- Adds the ability to run multiple benches (Norwegian SMB, AI-Act compliance,
-- Norwegian dialects, etc.) on the same platform.
--
-- Idempotent: safe to re-run.

-- Top-level bench. v0.1's data lives entirely under 'norwegian-smb'.
create table if not exists public.benches (
  slug          text primary key,
  name          text not null,
  description   text,
  parent_slug   text references public.benches(slug),
  is_public     boolean default true,
  weight        numeric(4,2) default 1.0,
  created_at    timestamptz default now()
);

insert into public.benches (slug, name, description, weight) values
  ('norwegian-smb',
   'Norsk SMB',
   'Faktura, kontrakt, MVA, lov, Brreg, HR/lønn, kundeservice, Bokmål↔Nynorsk',
   1.0)
on conflict (slug) do nothing;

-- Tag every existing category with its bench. Default = norwegian-smb.
alter table public.categories
  add column if not exists bench_slug text references public.benches(slug);

update public.categories
   set bench_slug = 'norwegian-smb'
 where bench_slug is null;

create index if not exists categories_bench_idx on public.categories(bench_slug);
