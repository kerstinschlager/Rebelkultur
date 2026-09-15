-- Product-level funnel analytics.
alter table public.checkout_events drop constraint if exists checkout_events_event_name_check;
alter table public.checkout_events add column if not exists product_id bigint references public.products(id) on delete set null;
alter table public.checkout_events add constraint checkout_events_event_name_check check (event_name in ('checkout_started','checkout_details_submitted','payment_redirected','payment_cancelled','purchase_completed','product_view','add_to_cart'));
create index if not exists checkout_events_product_idx on public.checkout_events(merchant_id,product_id,event_name,created_at desc);

create or replace function public.record_checkout_event(
  p_merchant_id uuid,
  p_visitor_key text,
  p_event_name text,
  p_order_id bigint default null,
  p_product_id bigint default null
) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if p_merchant_id is null or p_visitor_key is null or length(trim(p_visitor_key)) < 16 then raise exception 'invalid tracking data'; end if;
  if p_event_name not in ('checkout_started','checkout_details_submitted','payment_redirected','payment_cancelled','purchase_completed','product_view','add_to_cart') then raise exception 'invalid event'; end if;
  if p_product_id is not null and not exists (select 1 from public.products p where p.id=p_product_id and p.merchant_id=p_merchant_id) then raise exception 'invalid product'; end if;
  insert into public.checkout_events(merchant_id,visitor_key,event_name,order_id,product_id)
  values(p_merchant_id,trim(p_visitor_key),p_event_name,p_order_id,p_product_id);
end;
$$;
revoke all on function public.record_checkout_event(uuid,text,text,bigint,bigint) from public, anon, authenticated;
grant execute on function public.record_checkout_event(uuid,text,text,bigint,bigint) to service_role;
