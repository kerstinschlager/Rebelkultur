-- Harden checkout order creation.
-- Orders and order_items are now created through the server-side checkout flow / RPC,
-- so clients cannot forge totals, prices, payment state or order ownership.

create or replace function public.create_order_from_cart(
  p_items jsonb,
  p_shipping_name text,
  p_shipping_address text,
  p_shipping_postcode text,
  p_shipping_city text,
  p_shipping_country text
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id bigint;
  v_total numeric := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_merchant_id uuid;
  v_first_merchant_id uuid;
  v_multi_merchant boolean := false;
begin
  if auth.uid() is null then raise exception 'Anmeldung erforderlich'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Warenkorb ist leer'; end if;
  if coalesce(trim(p_shipping_name),'') = ''
     or coalesce(trim(p_shipping_address),'') = ''
     or coalesce(trim(p_shipping_postcode),'') = ''
     or coalesce(trim(p_shipping_city),'') = ''
     or coalesce(trim(p_shipping_country),'') = '' then
    raise exception 'Lieferadresse ist unvollständig';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      v_qty := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'Ungültige Menge';
    end;
    if v_qty is null or v_qty < 1 or v_qty > 1000 then raise exception 'Ungültige Menge'; end if;

    begin
      select * into v_product
      from public.products
      where id=(v_item->>'product_id')::bigint and active=true
      for update;
    exception when others then
      raise exception 'Ungültiges Produkt';
    end;

    if not found then raise exception 'Produkt nicht verfügbar'; end if;
    if v_product.stock < v_qty then raise exception 'Nicht genug Bestand für: %', v_product.name; end if;
    v_total := v_total + (v_product.price * v_qty);

    if v_first_merchant_id is null then
      v_first_merchant_id := v_product.merchant_id;
    elsif v_first_merchant_id is distinct from v_product.merchant_id then
      v_multi_merchant := true;
    end if;
  end loop;

  v_merchant_id := case when v_multi_merchant then null else v_first_merchant_id end;

  insert into public.orders(
    customer_id, customer_email, customer_name, status, payment_status,
    total, merchant_id, merchant_amount,
    shipping_name, shipping_address, shipping_postcode, shipping_city, shipping_country
  )
  values(
    auth.uid(),
    (select email from auth.users where id=auth.uid()),
    trim(p_shipping_name),
    'new',
    'unpaid',
    v_total,
    v_merchant_id,
    round(v_total - round(v_total * coalesce((select default_commission_rate from public.platform_settings where id=true),10.00)/100,2),2),
    trim(p_shipping_name), trim(p_shipping_address), trim(p_shipping_postcode), trim(p_shipping_city), trim(p_shipping_country)
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_product
    from public.products
    where id=(v_item->>'product_id')::bigint and active=true
    for update;
    if not found or v_product.stock < v_qty then raise exception 'Produkt nicht mehr verfügbar'; end if;

    insert into public.order_items(order_id, product_id, product_name, quantity, unit_price)
    values(v_order_id, v_product.id, v_product.name, v_qty, v_product.price);

    update public.products
    set stock=stock-v_qty, updated_at=now()
    where id=v_product.id;
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.create_order_from_cart(jsonb,text,text,text,text,text) from public;
grant execute on function public.create_order_from_cart(jsonb,text,text,text,text,text) to authenticated;

drop policy if exists orders_customer_insert on public.orders;
drop policy if exists order_items_customer_insert on public.order_items;
