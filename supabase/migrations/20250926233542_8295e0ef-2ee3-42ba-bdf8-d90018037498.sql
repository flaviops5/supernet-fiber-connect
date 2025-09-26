-- Criar função para buscar template baseado no plano
CREATE OR REPLACE FUNCTION public.get_contract_template_for_plan(plan_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
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