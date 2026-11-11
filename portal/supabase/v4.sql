-- brightfront v4: integrations (Xero, ServiceM8, Cliniko, Google Calendar, webhooks)
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

alter table public.leads add column if not exists integration_refs jsonb not null default '{}'::jsonb;

-- One row per client per app. Tokens and API keys live here, so only the agency can read or change it.
create table if not exists public.integrations (
  client_id uuid not null references public.clients(id) on delete cascade,
  provider text not null check (provider in ('xero','servicem8','cliniko','gcal','webhook')),
  status text not null default 'connected' check (status in ('connected','paused')),
  account_name text,
  config jsonb not null default '{}'::jsonb,
  tokens jsonb not null default '{}'::jsonb,
  last_error text,
  last_sync_at timestamptz,
  connected_at timestamptz default now(),
  primary key (client_id, provider)
);
alter table public.integrations enable row level security;
drop policy if exists agency_all on public.integrations;
create policy agency_all on public.integrations for all to authenticated using (public.is_agency()) with check (public.is_agency());
grant select, insert, update, delete on public.integrations to authenticated;
revoke all on public.integrations from anon;

-- What each integration did, per lead. Clients can read their own.
create table if not exists public.integration_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  provider text not null,
  lead_id uuid references public.leads(id) on delete set null,
  action text not null,
  ok boolean not null default true,
  detail text,
  created_at timestamptz default now()
);
create index if not exists integration_log_client on public.integration_log (client_id, created_at desc);
alter table public.integration_log enable row level security;
drop policy if exists agency_all on public.integration_log;
create policy agency_all on public.integration_log for all to authenticated using (public.is_agency()) with check (public.is_agency());
drop policy if exists client_read on public.integration_log;
create policy client_read on public.integration_log for select to authenticated using (client_id = public.my_client_id());
grant select on public.integration_log to authenticated;
revoke all on public.integration_log from anon;

-- Client-safe list of what's connected (no tokens)
create or replace function public.integration_status(p_client uuid)
returns table (provider text, status text, account_name text, last_error text, last_sync_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.provider, i.status, i.account_name, i.last_error, i.last_sync_at
  from public.integrations i
  where i.client_id = p_client and (public.is_agency() or p_client = public.my_client_id());
$$;
revoke all on function public.integration_status(uuid) from public, anon;
grant execute on function public.integration_status(uuid) to authenticated;
