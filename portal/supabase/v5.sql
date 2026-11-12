-- brightfront v5: hardening, results-based billing, agency resale (white-label partners)
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

------------------------------------------------------------------
-- 1. Partner agencies (resellers) and roles
------------------------------------------------------------------
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  slug text unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  logo_url text,
  brand_color text default '#0B0B2E',
  support_email text,
  website text,
  wholesale_fee numeric(10,2) not null default 0,   -- what the partner pays brightfront per active client per month
  status text not null default 'active' check (status in ('active','paused')),
  created_at timestamptz default now()
);
alter table public.clients add column if not exists agency_id uuid references public.agencies(id) on delete set null;
create index if not exists clients_agency on public.clients (agency_id);
alter table public.profiles add column if not exists agency_id uuid references public.agencies(id) on delete set null;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('agency','partner','client'));

-- Who's calling
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('agency','partner'));
$$;
create or replace function public.my_agency_id() returns uuid
language sql stable security definer set search_path = public as $$
  select agency_id from public.profiles where id = auth.uid() and role = 'partner';
$$;
-- True for brightfront (all clients) and for a partner on their own clients
create or replace function public.manages(p_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'agency'
           or (p.role = 'partner' and p.agency_id is not null
               and exists (select 1 from public.clients c where c.id = p_client and c.agency_id = p.agency_id))));
$$;
create or replace function public.manages_path(p_folder text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return public.manages(p_folder::uuid);
exception when others then return false;
end; $$;
-- Logged-in user who is not staff (service role and SQL editor are never restricted)
create or replace function public.restricted_user() returns boolean
language sql stable as $$
  select auth.uid() is not null and not public.is_staff();
$$;
grant execute on function public.my_role(), public.is_staff(), public.my_agency_id(), public.manages(uuid), public.manages_path(text) to authenticated;

-- Partner access: everything for their own clients, nothing else
do $$ declare t text; begin
  foreach t in array array['metrics','leads','posts','comments','requests','invoices','onboarding_steps','files',
                           'reply_settings','conversations','messages','calls','reviews','review_requests','creatives','reports',
                           'connections','integrations','integration_log'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists partner_all on public.%I', t);
      execute format('create policy partner_all on public.%I for all to authenticated using (public.manages(client_id)) with check (public.manages(client_id))', t);
    end if;
  end loop;
end $$;

-- Clients table: partners see and manage their own agency's clients
drop policy if exists partner_clients on public.clients;
create policy partner_clients on public.clients for all to authenticated
  using (agency_id is not null and agency_id = public.my_agency_id())
  with check (agency_id is not null and agency_id = public.my_agency_id());
create or replace function public.client_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() = 'partner' then new.agency_id := public.my_agency_id(); end if;
  return new;
end; $$;
drop trigger if exists client_defaults on public.clients;
create trigger client_defaults before insert or update on public.clients for each row execute function public.client_defaults();

-- Profiles: partners see their team and their clients' users
drop policy if exists partner_profiles on public.profiles;
create policy partner_profiles on public.profiles for select to authenticated
  using (public.my_role() = 'partner' and (agency_id = public.my_agency_id() or (client_id is not null and public.manages(client_id))));

-- Agencies: brightfront manages all; partners read and brand their own
alter table public.agencies enable row level security;
drop policy if exists agency_all on public.agencies;
create policy agency_all on public.agencies for all to authenticated using (public.is_agency()) with check (public.is_agency());
drop policy if exists partner_own on public.agencies;
create policy partner_own on public.agencies for select to authenticated using (id = public.my_agency_id());
drop policy if exists partner_brand on public.agencies;
create policy partner_brand on public.agencies for update to authenticated using (id = public.my_agency_id()) with check (id = public.my_agency_id());
create or replace function public.agency_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_agency() and auth.uid() is not null then
    new.wholesale_fee := old.wholesale_fee; new.status := old.status; new.slug := old.slug;
  end if;
  return new;
end; $$;
drop trigger if exists agency_guard on public.agencies;
create trigger agency_guard before update on public.agencies for each row execute function public.agency_guard();
grant select, insert, update, delete on public.agencies to authenticated;
revoke all on public.agencies from anon;

-- Branding for whoever is logged in (partner, or a partner's client). Empty = brightfront.
create or replace function public.my_brand()
returns table (name text, slug text, logo_url text, brand_color text, support_email text, website text)
language sql stable security definer set search_path = public as $$
  select a.name, a.slug, a.logo_url, a.brand_color, a.support_email, a.website
  from public.profiles p
  left join public.clients c on c.id = p.client_id
  join public.agencies a on a.id = coalesce(p.agency_id, c.agency_id)
  where p.id = auth.uid() and a.status = 'active';
$$;
-- Public branding for a partner's login page (?a=slug). Only public fields.
create or replace function public.brand_by_slug(p_slug text)
returns table (name text, logo_url text, brand_color text, support_email text)
language sql stable security definer set search_path = public as $$
  select name, logo_url, brand_color, support_email from public.agencies where slug = lower(p_slug) and status = 'active';
$$;
grant execute on function public.my_brand() to authenticated;
grant execute on function public.brand_by_slug(text) to anon, authenticated;

-- Link a signed-up user to a business (or make them a partner's team member)
create or replace function public.assign_user(p_email text, p_client uuid default null, p_agency uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_client is not null then
    if not public.manages(p_client) then raise exception 'Not allowed'; end if;
    update public.profiles set role = 'client', client_id = p_client, agency_id = null
      where email = lower(trim(p_email)) and role <> 'agency';
  elsif p_agency is not null then
    if not (public.is_agency() or p_agency = public.my_agency_id()) then raise exception 'Not allowed'; end if;
    update public.profiles set role = 'partner', agency_id = p_agency, client_id = null
      where email = lower(trim(p_email)) and role <> 'agency';
  else raise exception 'Choose a business or an agency';
  end if;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'No portal account with that email yet. Ask them to sign up first.'; end if;
end; $$;
revoke all on function public.assign_user(text, uuid, uuid) from public, anon;
grant execute on function public.assign_user(text, uuid, uuid) to authenticated;

-- Existing helper functions now also work for partners
create or replace function public.decide_post(p_post uuid, p_decision text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_decision not in ('approved','changes') then raise exception 'Invalid decision'; end if;
  update public.posts set status = p_decision, decided_at = now()
   where id = p_post and status = 'waiting' and (client_id = public.my_client_id() or public.manages(client_id));
  if not found then raise exception 'Post not found or already decided'; end if;
end; $$;
create or replace function public.complete_step(p_step uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.onboarding_steps set done = true, done_at = now()
   where id = p_step and (client_id = public.my_client_id() or public.manages(client_id));
end; $$;
create or replace function public.connection_status(p_client uuid)
returns table (meta_page_name text, meta_ig_username text, facebook boolean, instagram boolean, inbound_email text, checked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.meta_page_name, c.meta_ig_username, c.meta_page_token is not null and c.meta_page_id is not null,
         c.meta_ig_id is not null, c.inbound_email, c.meta_checked_at
  from public.connections c
  where c.client_id = p_client and (public.manages(p_client) or p_client = public.my_client_id());
$$;
create or replace function public.integration_status(p_client uuid)
returns table (provider text, status text, account_name text, last_error text, last_sync_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.provider, i.status, i.account_name, i.last_error, i.last_sync_at
  from public.integrations i
  where i.client_id = p_client and (public.manages(p_client) or p_client = public.my_client_id());
$$;

-- Files: partners can use their clients' folders
drop policy if exists "partner files manage" on storage.objects;
create policy "partner files manage" on storage.objects for all to authenticated
  using (bucket_id = 'client-files' and public.manages_path((storage.foldername(name))[1]))
  with check (bucket_id = 'client-files' and public.manages_path((storage.foldername(name))[1]));

------------------------------------------------------------------
-- 2. Hardening: clients can only change what they should
------------------------------------------------------------------
-- Sending number, sending address and intake key are set by staff only
create or replace function public.reply_settings_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.restricted_user() then
    if tg_op = 'INSERT' then
      new.sms_number := null; new.email_from := null; new.intake_key := encode(gen_random_bytes(16), 'hex');
    else
      new.sms_number := old.sms_number; new.email_from := old.email_from; new.intake_key := old.intake_key; new.client_id := old.client_id;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists reply_settings_guard on public.reply_settings;
create trigger reply_settings_guard before insert or update on public.reply_settings for each row execute function public.reply_settings_guard();

-- Clients can only take over, hand back or close a conversation. Opt-outs can never be undone by hand.
create or replace function public.conversation_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare st text := new.status;
begin
  if public.restricted_user() then
    new := old;
    if st in ('ai','human','closed') then new.status := st; end if;
  end if;
  if old.status = 'opted_out' then new.status := 'opted_out'; end if;
  return new;
end; $$;
drop trigger if exists conversation_guard on public.conversations;
create trigger conversation_guard before update on public.conversations for each row execute function public.conversation_guard();

-- Clients can update stage and notes on their leads, nothing that drives billing or syncing
create or replace function public.lead_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.restricted_user() then
    new.client_id := old.client_id; new.external_id := old.external_id; new.integration_refs := old.integration_refs;
    new.first_reply_seconds := old.first_reply_seconds; new.created_at := old.created_at; new.source := old.source;
  end if;
  return new;
end; $$;
drop trigger if exists lead_guard on public.leads;
create trigger lead_guard before update on public.leads for each row execute function public.lead_guard();

-- Every stage change is recorded (proof for billing and reports)
create table if not exists public.lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  from_status text, to_status text not null,
  actor uuid, actor_kind text,
  created_at timestamptz default now()
);
create index if not exists lead_events_lead on public.lead_events (lead_id, created_at);
create index if not exists lead_events_client on public.lead_events (client_id, created_at desc);
alter table public.lead_events enable row level security;
drop policy if exists staff_read on public.lead_events;
create policy staff_read on public.lead_events for select to authenticated using (public.manages(client_id));
drop policy if exists client_read on public.lead_events;
create policy client_read on public.lead_events for select to authenticated using (client_id = public.my_client_id());
grant select on public.lead_events to authenticated;
revoke all on public.lead_events from anon;

-- Abuse limits (used by the reply function with the service role only)
create table if not exists public.rate_hits (bucket text not null, at timestamptz not null default now());
create index if not exists rate_hits_bucket on public.rate_hits (bucket, at desc);
alter table public.rate_hits enable row level security;
create or replace function public.take_rate(p_bucket text, p_max int, p_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.rate_hits where bucket = p_bucket and at > now() - make_interval(secs => p_seconds);
  if n >= p_max then return false; end if;
  insert into public.rate_hits (bucket) values (p_bucket);
  if random() < 0.02 then delete from public.rate_hits where at < now() - interval '2 days'; end if;
  return true;
end; $$;
revoke all on function public.take_rate(text, int, int) from public, anon, authenticated;

-- Errors and warnings from the reply service, for the health panel
create table if not exists public.system_events (
  id bigint generated always as identity primary key,
  level text not null default 'error' check (level in ('info','warn','error')),
  source text not null,
  message text not null,
  client_id uuid references public.clients(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists system_events_time on public.system_events (created_at desc);
alter table public.system_events enable row level security;
drop policy if exists staff_read on public.system_events;
create policy staff_read on public.system_events for select to authenticated
  using (public.is_agency() or (client_id is not null and public.manages(client_id)));
grant select on public.system_events to authenticated;
revoke all on public.system_events from anon;

-- Speed
create index if not exists messages_client on public.messages (client_id, created_at desc);
create index if not exists leads_client_status on public.leads (client_id, status);
create index if not exists conversations_status on public.conversations (client_id, status);
create index if not exists profiles_email on public.profiles (email);

------------------------------------------------------------------
-- 3. Results-based billing
------------------------------------------------------------------
create table if not exists public.billing_plans (
  client_id uuid primary key references public.clients(id) on delete cascade,
  active boolean not null default true,
  monthly_fee numeric(10,2) not null default 0 check (monthly_fee >= 0),
  per_booking numeric(10,2) not null default 0 check (per_booking >= 0),
  per_won numeric(10,2) not null default 0 check (per_won >= 0),
  won_percent numeric(5,2) not null default 0 check (won_percent between 0 and 100),
  billing_email text,
  stripe_customer_id text,
  updated_at timestamptz default now()
);
create table if not exists public.billable_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  kind text not null check (kind in ('booking','won')),
  amount numeric(10,2) not null check (amount >= 0),
  status text not null default 'billable' check (status in ('billable','void','invoiced')),
  note text,
  invoice_id uuid references public.invoices(id) on delete set null,
  occurred_at timestamptz default now(),
  unique (lead_id, kind)
);
create index if not exists billable_client on public.billable_events (client_id, occurred_at desc);
alter table public.invoices add column if not exists period_start date;
alter table public.invoices add column if not exists period_end date;
alter table public.invoices add column if not exists stripe_invoice_id text;

alter table public.billing_plans enable row level security;
alter table public.billable_events enable row level security;
do $$ declare t text; begin
  foreach t in array array['billing_plans','billable_events'] loop
    execute format('drop policy if exists staff_all on public.%I', t);
    execute format('create policy staff_all on public.%I for all to authenticated using (public.manages(client_id)) with check (public.manages(client_id))', t);
    execute format('drop policy if exists client_read on public.%I', t);
    execute format('create policy client_read on public.%I for select to authenticated using (client_id = public.my_client_id())', t);
  end loop;
end $$;
grant select, insert, update, delete on public.billing_plans, public.billable_events to authenticated;
revoke all on public.billing_plans, public.billable_events from anon;

-- On every stage change: record it, and add billable bookings / wins once per lead
create or replace function public.lead_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare bp public.billing_plans;
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.lead_events (lead_id, client_id, from_status, to_status, actor, actor_kind)
    values (new.id, new.client_id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid(),
            case when auth.uid() is null then 'system' when public.is_staff() then 'staff' else 'client' end);
    select * into bp from public.billing_plans where client_id = new.client_id and active;
    if found then
      if new.status in ('booked','won') and bp.per_booking > 0 then
        insert into public.billable_events (client_id, lead_id, kind, amount)
        values (new.client_id, new.id, 'booking', bp.per_booking) on conflict (lead_id, kind) do nothing;
      end if;
      if new.status = 'won' and (bp.per_won > 0 or bp.won_percent > 0) then
        insert into public.billable_events (client_id, lead_id, kind, amount)
        values (new.client_id, new.id, 'won', round(bp.per_won + coalesce(new.value, 0) * bp.won_percent / 100, 2))
        on conflict (lead_id, kind) do nothing;
      end if;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists lead_status_change on public.leads;
create trigger lead_status_change after insert or update of status on public.leads for each row execute function public.lead_status_change();

------------------------------------------------------------------
-- 4. Staff must use two-step login. Without it, a staff account sees nothing.
------------------------------------------------------------------
create or replace function public.mfa_ok() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;
create or replace function public.is_agency() returns boolean
language sql stable security definer set search_path = public as $$
  select public.mfa_ok() and exists (select 1 from public.profiles where id = auth.uid() and role = 'agency');
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.mfa_ok() and exists (select 1 from public.profiles where id = auth.uid() and role in ('agency','partner'));
$$;
create or replace function public.my_agency_id() returns uuid
language sql stable security definer set search_path = public as $$
  select agency_id from public.profiles where id = auth.uid() and role = 'partner' and public.mfa_ok();
$$;
create or replace function public.manages(p_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mfa_ok() and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'agency'
           or (p.role = 'partner' and p.agency_id is not null
               and exists (select 1 from public.clients c where c.id = p_client and c.agency_id = p.agency_id))));
$$;
-- A staff account without two-step login must not look like a normal client either
create or replace function public.restricted_user() returns boolean
language sql stable as $$
  select auth.uid() is not null and not public.is_staff();
$$;
grant execute on function public.mfa_ok() to authenticated;
