-- brightfront v10: Tilly Voice (the assistant answers the phone) and call tracking numbers
-- Run once in Supabase -> SQL Editor after v9. Safe to run again.

-- 1. Tilly Voice settings
alter table public.reply_settings add column if not exists voice_enabled boolean not null default false;
alter table public.reply_settings add column if not exists voice_mode text not null default 'missed';
alter table public.reply_settings drop constraint if exists reply_settings_voice_mode_check;
alter table public.reply_settings add constraint reply_settings_voice_mode_check check (voice_mode in ('missed','always'));
alter table public.reply_settings add column if not exists voice_greeting text;

-- 2. Phone calls are conversations too (the transcript lands in the inbox)
alter table public.conversations drop constraint if exists conversations_channel_check;
alter table public.conversations add constraint conversations_channel_check
  check (channel in ('sms','email','messenger','instagram','voice'));

-- 3. Call tracking: one number per ad or source, each call is logged against it
create table if not exists public.tracking_numbers (
  number text primary key,                 -- +61... Twilio number, "A call comes in" -> /reply/voice
  client_id uuid not null references public.clients(id) on delete cascade,
  source text not null,                    -- e.g. "Google Ads", "Van signage", "Facebook ads"
  forward_to text,                         -- optional: ring this mobile instead of the business default
  last_call_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tracking_numbers_client on public.tracking_numbers (client_id);
alter table public.tracking_numbers enable row level security;
drop policy if exists staff_all on public.tracking_numbers;
create policy staff_all on public.tracking_numbers for all to authenticated using (public.manages(client_id)) with check (public.manages(client_id));
drop policy if exists client_read on public.tracking_numbers;
create policy client_read on public.tracking_numbers for select to authenticated using (client_id = public.my_client_id());
grant select, insert, update, delete on public.tracking_numbers to authenticated;
revoke all on public.tracking_numbers from anon;
