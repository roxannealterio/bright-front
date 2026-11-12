-- brightfront v8: Roxy brings regulars back, and knows when you're booked out
-- Run once in Supabase -> SQL Editor after v7. Safe to run again.

-- 1. Rebooking reminders for repeat work (pest treatments, cleans, house washes, services)
alter table public.leads add column if not exists rebook_days int;            -- gap between jobs for this customer
alter table public.leads add column if not exists rebook_at timestamptz;      -- when the next reminder goes out
alter table public.leads add column if not exists rebook_sent_at timestamptz; -- last reminder sent
create index if not exists leads_rebook_due on public.leads (rebook_at) where rebook_at is not null;

alter table public.reply_settings add column if not exists rebook_enabled boolean not null default true;
alter table public.reply_settings add column if not exists rebook_default_days int;   -- empty = only when set per customer
alter table public.reply_settings drop constraint if exists reply_settings_rebook_days_check;
alter table public.reply_settings add constraint reply_settings_rebook_days_check check (rebook_default_days is null or rebook_default_days between 1 and 1100);
alter table public.reply_settings add column if not exists rebook_text text;          -- optional custom reminder

-- 2. Booked-out mode: the assistant still takes the details but says when new work can start
alter table public.reply_settings add column if not exists booked_until date;
alter table public.reply_settings add column if not exists booked_note text;

-- 3. When a job is marked Won, schedule the next reminder from the customer's gap or the business default
create or replace function public.schedule_rebook() returns trigger
language plpgsql security definer set search_path = public as $$
declare d int;
begin
  if new.status = 'won' and (old.status is distinct from 'won') and new.rebook_at is null then
    select coalesce(new.rebook_days, rs.rebook_default_days) into d
      from public.reply_settings rs where rs.client_id = new.client_id and rs.rebook_enabled;
    if d is not null and d > 0 then
      new.rebook_at := now() + make_interval(days => d);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists schedule_rebook on public.leads;
create trigger schedule_rebook before update of status on public.leads
  for each row execute function public.schedule_rebook();
