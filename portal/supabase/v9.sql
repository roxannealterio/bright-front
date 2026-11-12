-- brightfront v9: Tilly plans
-- Run once in Supabase -> SQL Editor after v8. Safe to run again.
alter table public.clients drop constraint if exists clients_plan_check;
update public.clients set plan = case plan
  when 'Keep it live' then 'Tilly Starter'
  when 'Keep it moving' then 'Tilly Growth'
  when 'Keep it growing' then 'Tilly Team'
  else plan end
where plan like 'Keep it %';
alter table public.clients add constraint clients_plan_check
  check (plan is null or plan in ('Tilly Starter', 'Tilly Growth', 'Tilly Team'));
