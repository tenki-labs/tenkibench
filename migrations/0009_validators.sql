-- TenkiBench v0.9 — validator recruitment system.
-- Norwegian professionals (lawyers, accountants, doctors, engineers) can apply
-- to validate benchmark tasks. Admin reviews & assigns task ids (tasks live as
-- files, so task_id is a free-form text reference).
-- Idempotent: safe to re-run.

create table if not exists public.validator_applications (
  id              bigserial primary key,
  name            text not null,
  email           text not null unique,
  title           text,
  employer        text,
  linkedin_url    text,
  expertise_areas text[] not null,
  bio             text,
  hourly_rate_nok integer,
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected', 'inactive')),
  applied_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     text,
  admin_notes     text
);

create index if not exists validator_applications_by_email
  on public.validator_applications (email);

create index if not exists validator_applications_by_status
  on public.validator_applications (status);

create index if not exists validator_applications_by_expertise
  on public.validator_applications using gin (expertise_areas);

create table if not exists public.validator_task_assignments (
  validator_id        bigint not null
                        references public.validator_applications(id)
                        on delete cascade,
  task_id             text   not null,
  assigned_at         timestamptz not null default now(),
  completed_at        timestamptz,
  validation_status   text   default 'pending'
                        check (validation_status in
                          ('pending', 'approved', 'rejected', 'needs-revision')),
  validation_comments text,
  primary key (validator_id, task_id)
);

create index if not exists validator_task_assignments_by_status
  on public.validator_task_assignments (validation_status);
