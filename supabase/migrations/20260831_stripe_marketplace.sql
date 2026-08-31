-- Stripe Connect marketplace foundation
alter table public.merchants
  add column if not exists stripe_account_id text,
  add column if not exists stripe_onboarding_complete boolean not null default false;

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists shipping_address text,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists commission_amount numeric not null default 0,
  add column if not exists merchant_amount numeric not null default 0,
  add column if not exists paid_at timestamptz;

create index if not exists merchants_stripe_account_id_idx on public.merchants(stripe_account_id);
create index if not exists orders_stripe_checkout_session_id_idx on public.orders(stripe_checkout_session_id);

-- Keep payment status constrained to the values used by the marketplace.
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid','pending','paid','failed','refunded'));
