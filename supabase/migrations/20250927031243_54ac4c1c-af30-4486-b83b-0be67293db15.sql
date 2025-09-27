-- Corrigir search_path das funções existentes para segurança
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contract_num TEXT;
  year_suffix TEXT;
BEGIN
  year_suffix := EXTRACT(YEAR FROM NOW())::TEXT;
  
  SELECT 'CT' || year_suffix || '-' || LPAD((COUNT(*) + 1)::TEXT, 6, '0')
  INTO contract_num
  FROM public.signed_contracts
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  RETURN contract_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_contract_template_for_plan(plan_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template_id UUID;
BEGIN
  -- Primeiro, tenta encontrar um template específico para o plano
  SELECT id INTO template_id
  FROM contract_templates
  WHERE is_active = true
    AND (plan_types @> to_jsonb(ARRAY[plan_name]) OR plan_types @> to_jsonb(ARRAY['all']))
  ORDER BY 
    CASE WHEN plan_types @> to_jsonb(ARRAY[plan_name]) THEN 1 ELSE 2 END,
    created_at DESC
  LIMIT 1;
  
  -- Se não encontrar, usa o template padrão
  IF template_id IS NULL THEN
    SELECT id INTO template_id
    FROM contract_templates
    WHERE is_active = true
      AND plan_types @> to_jsonb(ARRAY['all'])
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  RETURN template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;