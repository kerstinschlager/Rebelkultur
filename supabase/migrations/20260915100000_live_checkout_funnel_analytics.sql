create table if not exists public.checkout_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  visitor_key text not null,
  event_name text not null check (event_name in ('checkout_started','checkout_details_submitted','payment_redirected','payment_cancelled','purchase_completed')),
  order_id bigint,
  created_at timestamptz not null default now()
);
create index if not exists checkout_events_merchant_created_idx on public.checkout_events(merchant_id, created_at desc);
create index if not exists checkout_events_merchant_event_idx on public.checkout_events(merchant_id, event_name, created_at desc);
create index if not exists checkout_events_visitor_idx on public.checkout_events(merchant_id, visitor_key, created_at desc);
alter table public.checkout_events enable row level security;
revoke all on public.checkout_events from anon, authenticated;
grant select on public.checkout_events to authenticated;
drop policy if exists checkout_events_merchant_select on public.checkout_events;
create policy checkout_events_merchant_select on public.checkout_events
for select to authenticated using (exists (select 1 from public.merchants m where m.id=checkout_events.merchant_id and m.owner_id=auth.uid()));

create or replace function public.record_checkout_event(
  p_merchant_id uuid,
  p_visitor_key text,
  p_event_name text,
  p_order_id bigint default null
) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if p_merchant_id is null or p_visitor_key is null or length(trim(p_visitor_key)) < 16 then raise exception 'invalid tracking data'; end if;
  if p_event_name not in ('checkout_started','checkout_details_submitted','payment_redirected','payment_cancelled','purchase_completed') then raise exception 'invalid event'; end if;
  insert into public.checkout_events(merchant_id,visitor_key,event_name,order_id)
  values(p_merchant_id,trim(p_visitor_key),p_event_name,p_order_id);
end;
$$;
revoke all on function public.record_checkout_event(uuid,text,text,bigint) from public, anon, authenticated;
grant execute on function public.record_checkout_event(uuid,text,text,bigint) to service_role;
