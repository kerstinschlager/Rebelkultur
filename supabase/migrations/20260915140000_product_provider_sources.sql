alter table public.products add column if not exists source_provider text;
alter table public.products add column if not exists source_product_id text;
alter table public.product_variants add column if not exists source_variant_id text;

create unique index if not exists products_source_unique
  on public.products(merchant_id, source_provider, source_product_id)
  where source_provider is not null and source_product_id is not null;

create unique index if not exists product_variants_source_unique
  on public.product_variants(product_id, source_variant_id)
  where source_variant_id is not null;
