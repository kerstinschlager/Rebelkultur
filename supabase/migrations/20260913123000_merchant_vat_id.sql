-- Require a merchant VAT/USt-IdNr. before a shop can be published.
-- The value is stored on the merchant record and normalized by the app.

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS vat_id text;

ALTER TABLE public.merchants
  DROP CONSTRAINT IF EXISTS merchants_vat_id_format_chk;

ALTER TABLE public.merchants
  ADD CONSTRAINT merchants_vat_id_format_chk
  CHECK (
    vat_id IS NULL
    OR upper(regexp_replace(trim(vat_id), '\\s+', '', 'g')) ~ '^[A-Z]{2}[A-Z0-9]{2,14}$'
  );

CREATE OR REPLACE FUNCTION public.enforce_merchant_vat_before_publish()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.published = true AND nullif(regexp_replace(upper(trim(COALESCE(NEW.vat_id, ''))), '\\s+', '', 'g'), '') IS NULL THEN
    RAISE EXCEPTION 'Eine gültige USt-IdNr. (VAT ID) ist erforderlich, bevor der Händler-Shop veröffentlicht werden kann.';
  END IF;

  IF NEW.vat_id IS NOT NULL THEN
    NEW.vat_id := nullif(regexp_replace(upper(trim(NEW.vat_id)), '\\s+', '', 'g'), '');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS merchants_require_vat_before_publish ON public.merchants;

CREATE TRIGGER merchants_require_vat_before_publish
BEFORE INSERT OR UPDATE OF vat_id, published ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.enforce_merchant_vat_before_publish();
