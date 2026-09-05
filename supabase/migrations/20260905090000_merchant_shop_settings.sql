-- Persist merchant shop settings in Supabase instead of browser-only localStorage.
create table if not exists public.merchant_shop_settings (
  merchant_id uuid primary key references public.merchants(id) on delete cascade,
  shop_name text,
  shop_url text,
  payment_provider text,
  order_email text,
  updated_at timestamptz not null default now()
);

alter table public.merchant_shop_settings enable row level security;

revoke all on public.merchant_shop_settings from anon, public;
grant select, insert, update on public.merchant_shop_settings to authenticated;

drop policy if exists "merchant settings owner access" on public.merchant_shop_settings;
create policy "merchant settings owner access"
on public.merchant_shop_settings
for all
to authenticated
using (
  exists (
    select 1 from public.merchants m
    where m.id = merchant_shop_settings.merchant_id
      and m.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.merchants m
    where m.id = merchant_shop_settings.merchant_id
      and m.owner_id = auth.uid()
  )
);

create index if not exists merchant_shop_settings_updated_at_idx
  on public.merchant_shop_settings(updated_at desc);
