alter table public.merchant_integrations drop constraint if exists merchant_integrations_provider_check;

alter table public.merchant_integrations
  add constraint merchant_integrations_provider_check
  check (provider = any (array[
    'printify'::text,
    'spreadconnect'::text,
    'printful'::text,
    'gelato'::text,
    'prodigi'::text,
    'etsy'::text,
    'woocommerce'::text
  ]));
