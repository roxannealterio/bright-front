-- brightfront v7: Ava chases unpaid Xero invoices
-- Run once in Supabase -> SQL Editor after v6. Safe to run again.

create table if not exists public.invoice_chases (
  client_id uuid not null references public.clients(id) on delete cascade,
  invoice_id text not null,                 -- Xero InvoiceID
  invoice_number text,
  contact_name text,
  amount_due numeric,
  due_date date,
  step int not null default 0,              -- reminders sent (0-3)
  stopped boolean not null default false,   -- customer replied, opted out, or no contact details
  note text,
  channel text,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (client_id, invoice_id)
);
alter table public.invoice_chases enable row level security;

-- brightfront and partners see their clients' reminders; a business sees its own. Only the server writes.
drop policy if exists staff_read on public.invoice_chases;
create policy staff_read on public.invoice_chases for select to authenticated using (public.manages(client_id));
drop policy if exists client_read on public.invoice_chases;
create policy client_read on public.invoice_chases for select to authenticated using (client_id = public.my_client_id());
grant select on public.invoice_chases to authenticated;
revoke all on public.invoice_chases from anon;
