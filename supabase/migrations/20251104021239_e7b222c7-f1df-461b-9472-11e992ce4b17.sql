-- Universal CPF masking: enforce masking on all values and future writes
-- 1) Backfill: mask every existing CPF that isn't already masked
UPDATE public.conversations
SET customer_cpf = '***.***.***-' || RIGHT(REGEXP_REPLACE(customer_cpf, '[^0-9]', '', 'g'), 2)
WHERE customer_cpf IS NOT NULL
  AND customer_cpf NOT LIKE '%*%';

-- 2) Trigger: always mask CPF on insert/update (no exceptions)
CREATE OR REPLACE FUNCTION public.mask_cpf_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_cpf IS NOT NULL THEN
    NEW.customer_cpf := '***.***.***-' || RIGHT(REGEXP_REPLACE(NEW.customer_cpf, '[^0-9]', '', 'g'), 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS mask_cpf_trigger ON public.conversations;
CREATE TRIGGER mask_cpf_trigger
  BEFORE INSERT OR UPDATE OF customer_cpf ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.mask_cpf_before_insert();