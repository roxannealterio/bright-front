-- brightfront v6: Ava, the admin
--   missed-call text-back, quote chasing, daily owner summary, draft-approve mode
-- Run once in Supabase -> SQL Editor. Safe to run again.

-- 1. Settings for Ava's admin jobs
alter table public.reply_settings add column if not exists approval_mode text not null default 'auto';
alter table public.reply_settings drop constraint if exists reply_settings_approval_mode_check;
alter table public.reply_settings add constraint reply_settings_approval_mode_check check (approval_mode in ('auto','simple','draft'));
alter table public.reply_settings add column if not exists missed_call_enabled boolean not null default true;
alter table public.reply_settings add column if not exists forward_phone text;          -- where calls to the business number ring first
alter table public.reply_settings add column if not exists missed_call_text text;        -- optional custom text-back message
alter table public.reply_settings add column if not exists quote_chase_enabled boolean not null default true;
alter table public.reply_settings add column if not exists daily_summary_enabled boolean not null default true;
alter table public.reply_settings add column if not exists daily_summary_hour int not null default 18;
alter table public.reply_settings drop constraint if exists reply_settings_summary_hour_check;
alter table public.reply_settings add constraint reply_settings_summary_hour_check check (daily_summary_hour between 5 and 22);
alter table public.reply_settings add column if not exists last_summary_on date;

-- 2. Quotes Ava chases
alter table public.leads add column if not exists quoted_at timestamptz;
alter table public.leads add column if not exists chase_step int not null default 0;     -- 0-3 follow-ups sent; 9 = stopped
alter table public.leads add column if not exists last_chased_at timestamptz;
create index if not exists leads_quote_chase on public.leads (client_id, quoted_at) where quoted_at is not null and chase_step < 3;

-- 3. Drafts waiting for approval
alter table public.messages add column if not exists status text not null default 'sent';
alter table public.messages drop constraint if exists messages_status_check;
alter table public.messages add constraint messages_status_check check (status in ('sent','draft','discarded'));
alter table public.conversations add column if not exists pending_draft boolean not null default false;
create index if not exists messages_drafts on public.messages (conversation_id) where status = 'draft';

-- 4. Missed calls, for the daily summary and reporting
alter table public.conversations add column if not exists origin text;                    -- e.g. 'missed_call'

-- 5. Run Ava's scheduled jobs every hour (quote chasing + daily summary).
--    Needs the pg_cron and pg_net extensions: Database -> Extensions -> turn on "pg_cron" and "pg_net".
--    Replace REPLACE_WITH_CRON_SECRET with the same value as the CRON_SECRET secret on the "reply" function.
--    Don't save the real secret in GitHub.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('ava-hourly') where exists (select 1 from cron.job where jobname = 'ava-hourly');
select cron.schedule('ava-hourly', '5 * * * *', $$
  select net.http_post(
    url := 'https://cupsusqjcgefmfhdznmo.supabase.co/functions/v1/reply/cron',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
$$);
