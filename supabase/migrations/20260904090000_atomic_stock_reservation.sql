-- Atomic stock reservation for marketplace checkout.
-- Prevents concurrent checkouts from overselling the same product.

create or replace function public.reserve_product_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  v_product_id bigint;
  v_quantity integer;
  v_stock integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Ungültige Warenkorbpositionen';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (item->>'product_id')::bigint;
    v_quantity := (item->>'quantity')::integer;

    if v_product_id is null or v_quantity is null or v_quantity < 1 then
      raise exception 'Ungültige Warenkorbpositionen';
    end if;

    update public.products
      set stock = stock - v_quantity
    where id = v_product_id
      and active = true
      and stock >= v_quantity
    returning stock into v_stock;

    if not found then
      raise exception 'Produkt %: nicht genug Bestand oder nicht verfügbar.', v_product_id;
    end if;
  end loop;
end;
$$;

create or replace function public.release_product_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  v_product_id bigint;
  v_quantity integer;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Ungültige Reservierung';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (item->>'product_id')::bigint;
    v_quantity := (item->>'quantity')::integer;

    if v_product_id is null or v_quantity is null or v_quantity < 1 then
      raise exception 'Ungültige Reservierung';
    end if;

    update public.products
      set stock = stock + v_quantity
    where id = v_product_id;
  end loop;
end;
$$;

revoke all on function public.reserve_product_stock(jsonb) from public, anon, authenticated;
revoke all on function public.release_product_stock(jsonb) from public, anon, authenticated;
