-- brightfront v3: every channel in one lead database
-- Facebook/Instagram lead ads + DMs, inbound email, universal hook, CSV export.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

-- Conversations can now be Messenger and Instagram DMs too
alter table public.conversations drop constraint if exists conversations_channel_check;
alter table public.conversations add constraint conversations_channel_check
  check (channel in ('sms','email','messenger','instagram'));

-- Stop the same lead being saved twice (Meta retries, email resends)
alter table public.leads add column if not exists external_id text;
create unique index if not exists leads_external on public.leads (client_id, external_id) where external_id is not null;
create index if not exists leads_client_created on public.leads (client_id, created_at desc);

-- Let a client switch DM replies off separately
alter table public.reply_settings add column if not exists dm_enabled boolean not null default true;

-- Channel connections. Holds Meta page tokens, so only the agency can read or change it.
create table if not exists public.connections (
  client_id uuid primary key references public.clients(id) on delete cascade,
  meta_page_id text unique,
  meta_page_name text,
  meta_page_token text,
  meta_ig_id text unique,
  meta_ig_username text,
  meta_checked_at timestamptz,
  lead_ads boolean not null default true,
  dms boolean not null default true,
  inbound_email text,          -- address that forwards into /reply/email (also used as Reply-To on AI emails)
  updated_at timestamptz default now()
);
alter table public.connections enable row level security;
drop policy if exists agency_all on public.connections;
create policy agency_all on public.connections for all to authenticated using (public.is_agency()) with check (public.is_agency());
grant select, insert, update, delete on public.connections to authenticated;
revoke all on public.connections from anon;

-- What a client is allowed to see about their own connections (never the token)
create or replace function public.connection_status(p_client uuid)
returns table (meta_page_name text, meta_ig_username text, facebook boolean, instagram boolean, inbound_email text, checked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.meta_page_name, c.meta_ig_username, c.meta_page_token is not null and c.meta_page_id is not null,
         c.meta_ig_id is not null, c.inbound_email, c.meta_checked_at
  from public.connections c
  where c.client_id = p_client and (public.is_agency() or p_client = public.my_client_id());
$$;
revoke all on function public.connection_status(uuid) from public, anon;
grant execute on function public.connection_status(uuid) to authenticated;
