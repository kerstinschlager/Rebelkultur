-- Harden merchant order management.
-- Merchants may only update operational fields on orders that belong to them.
-- Payment state, totals, ownership and customer data remain server-controlled.

create or replace function public.merchant_update_order(
  p_order_id bigint,
  p_status text default null,
  p_tracking_number text default null,
  p_shipping_carrier text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_merchant_id uuid;
  v_old_status text;
  v_new_status text;
  v_tracking text;
  v_carrier text;
begin
  if auth.uid() is null then raise exception 'Anmeldung erforderlich'; end if;

  select o.merchant_id, o.status
    into v_merchant_id, v_old_status
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then raise exception 'Bestellung nicht gefunden'; end if;
  if v_merchant_id is distinct from auth.uid() then
    raise exception 'Keine Berechtigung für diese Bestellung';
  end if;

  v_new_status := coalesce(nullif(trim(p_status), ''), v_old_status);
  if v_new_status not in ('new','processing','shipped','completed','cancelled') then
    raise exception 'Ungültiger Bestellstatus';
  end if;

  -- Prevent merchants from moving a completed/cancelled order back into processing.
  if v_old_status in ('completed','cancelled') and v_new_status is distinct from v_old_status then
    raise exception 'Dieser Bestellstatus kann nicht mehr geändert werden';
  end if;

  v_tracking := nullif(trim(coalesce(p_tracking_number, '')), '');
  v_carrier := nullif(trim(coalesce(p_shipping_carrier, '')), '');

  update public.orders
  set status = v_new_status,
      tracking_number = coalesce(v_tracking, tracking_number),
      shipping_carrier = coalesce(v_carrier, shipping_carrier),
      updated_at = now()
  where id = p_order_id and merchant_id = auth.uid();

  return true;
end;
$$;

revoke all on function public.merchant_update_order(bigint,text,text,text) from public;
grant execute on function public.merchant_update_order(bigint,text,text,text) to authenticated;

-- Keep direct customer/merchant updates out of the table where the application
-- can otherwise accidentally expose protected columns.
drop policy if exists orders_merchant_update on public.orders;
