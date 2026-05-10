-- TenkiBench v0.8 — OIDC state lagring + auth webhook event log.
--
-- Brukes når bench.tenki.no kjører som registrert OIDC-klient mot
-- auth.tenki.no (Authorization Code + PKCE). State + code_verifier
-- lagres mellom /api/auth/login og /api/auth/callback. Webhook-eventer
-- (logout, role_change, user_deleted) lagres for nå bare som rå log
-- — fremtidig kan vi reagere på dem (rydde lokale sesjoner osv.).
--
-- Idempotent: trygg å re-kjøre.

create table if not exists public.oidc_state (
  state          text primary key,
  code_verifier  text not null,
  redirect_to    text,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);

create index if not exists oidc_state_expires_at_idx
  on public.oidc_state (expires_at);

create table if not exists public.auth_webhook_events (
  id          bigserial primary key,
  event       text not null,
  user_id     text,
  payload     jsonb not null default '{}'::jsonb,
  signature   text,
  received_at timestamptz not null default now()
);

create index if not exists auth_webhook_events_received_at_idx
  on public.auth_webhook_events (received_at desc);

create index if not exists auth_webhook_events_event_idx
  on public.auth_webhook_events (event);
