-- Security hardening applied to production on 2026-09-10.
-- Keep this migration in source control so the database schema and permissions
-- remain reproducible for future environments.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid, n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;

ALTER FUNCTION public.set_merchant_legal_updated_at()
  SET search_path = public, pg_temp;

-- Public storefront RPCs remain callable anonymously by design.
-- All other SECURITY DEFINER RPCs are restricted to signed-in callers.
REVOKE EXECUTE ON FUNCTION public.admin_create_payout(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats(timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_mark_payout_paid(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_merchant_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_merchants(timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_orders(timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_payouts(timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_platform_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_default_commission(numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_merchant_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_order_from_cart(jsonb, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.customer_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_category(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.merchant_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.merchant_set_order_status(bigint, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.merchant_update_order_status(bigint, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.merchant_update_profile(text, text, text, text, text, text, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.merchant_update_profile_v2(uuid, text, text, text, text, text, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.merchant_update_shipping(bigint, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_order_commission() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_merchant_profile(text, text, text, text, text, text, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_order_stock(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.release_order_stock(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reserve_order_stock(bigint, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.release_expired_stock_reservations() FROM anon;
