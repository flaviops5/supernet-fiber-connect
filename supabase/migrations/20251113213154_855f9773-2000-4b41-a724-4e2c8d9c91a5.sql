-- ============================================
-- SECURITY FIX: Add SET search_path to all SECURITY DEFINER functions
-- Previne schema hijacking attacks (OWASP A01:2021)
-- ============================================

-- Corrigir função: mask_cpf_before_insert
CREATE OR REPLACE FUNCTION public.mask_cpf_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.client_cpf IS NOT NULL AND LENGTH(NEW.client_cpf) = 11 THEN
    NEW.client_cpf := OVERLAY(NEW.client_cpf PLACING '***' FROM 4 FOR 3);
  END IF;
  RETURN NEW;
END;
$$;

-- Corrigir função: has_role (com cast correto para user_role)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role::user_role
  )
$$;

-- Log da correção
INSERT INTO public.action_log (agent_name, action_type, action_payload)
VALUES (
  'security_migration',
  'search_path_fix',
  jsonb_build_object(
    'migration', 'add_search_path_to_security_definer',
    'functions_corrected', ARRAY['mask_cpf_before_insert', 'has_role'],
    'timestamp', NOW()
  )
);