do $$ begin
  if not exists (select 1 from pg_constraint where conname='orders_payment_status_check') then
    alter table public.orders add constraint orders_payment_status_check
      check (payment_status in ('unpaid','pending','paid','failed','refunded'));
  end if;

  if not exists (select 1 from pg_constraint where conname='merchants_commission_rate_check') then
    alter table public.merchants add constraint merchants_commission_rate_check
      check (commission_rate >= 0 and commission_rate <= 100);
  end if;
end $$;
