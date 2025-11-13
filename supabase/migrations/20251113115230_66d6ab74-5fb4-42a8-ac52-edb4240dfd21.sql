-- ============================================
-- FASE 1: Correção de SECURITY DEFINER Críticos
-- Data: 2025-11-13
-- Objetivo: Corrigir 3 funções com vulnerabilidades críticas
-- ============================================

-- ============================================
-- 1. Corrigir validate_calendar_token()
-- Problema: Retorna dados sensíveis sem validar ownership
-- Solução: Adicionar validação de membership antes de retornar dados
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_calendar_token(p_token text)
RETURNS TABLE(board_id uuid, entity_name text, entity_filter jsonb, is_valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
  v_user_id uuid;
BEGIN
  -- Obter user_id autenticado
  v_user_id := auth.uid();
  
  -- Obter board_id do token
  SELECT t.board_id INTO v_board_id
  FROM public.calendar_access_tokens t
  WHERE t.token = p_token
    AND t.is_active = true
    AND (t.expires_at IS NULL OR t.expires_at > now());
  
  -- VALIDAÇÃO CRÍTICA: Verificar se usuário tem acesso ao board
  IF v_board_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM public.kanban_board_members 
      WHERE board_id = v_board_id 
        AND user_id = v_user_id
    ) THEN
      -- Usuário não tem acesso ao board
      RAISE EXCEPTION 'Unauthorized access to board calendar';
    END IF;
  END IF;
  
  -- Atualizar estatísticas de acesso
  UPDATE public.calendar_access_tokens
  SET 
    last_accessed_at = now(),
    access_count = access_count + 1
  WHERE token = p_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  -- Retornar dados do token (apenas se validação passou)
  RETURN QUERY
  SELECT 
    t.board_id,
    t.entity_name,
    t.entity_filter,
    (t.is_active AND (t.expires_at IS NULL OR t.expires_at > now())) as is_valid
  FROM public.calendar_access_tokens t
  WHERE t.token = p_token;
END;
$$;

-- ============================================
-- 2. Corrigir log_user_activity()
-- Problema: Aceita user_id externo, permitindo spoofing
-- Solução: SEMPRE usar auth.uid() internamente
-- ============================================

CREATE OR REPLACE FUNCTION public.log_user_activity(
  activity_type text,
  activity_description text,
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  current_user_id UUID;
BEGIN
  -- SEMPRE usar o usuário autenticado
  current_user_id := auth.uid();
  
  -- Validar que há um usuário autenticado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to log activity';
  END IF;
  
  INSERT INTO public.user_activity_logs (
    user_id,
    activity_type,
    activity_description,
    metadata
  ) VALUES (
    current_user_id,
    activity_type,
    activity_description,
    metadata_param
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- ============================================
-- 3. Corrigir log_security_event()
-- Problema: Aceita user_id externo, permitindo spoofing
-- Solução: SEMPRE usar auth.uid() internamente
-- ============================================

CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  event_description text,
  details_param jsonb DEFAULT '{}'::jsonb,
  severity_param text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  current_user_id UUID;
BEGIN
  -- SEMPRE usar o usuário autenticado
  current_user_id := auth.uid();
  
  -- Validar que há um usuário autenticado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to log security events';
  END IF;
  
  INSERT INTO public.security_logs (
    user_id,
    event_type,
    event_description,
    details,
    severity
  ) VALUES (
    current_user_id,
    event_type,
    event_description,
    details_param,
    severity_param
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- ============================================
-- 4. Criar função separada para logs de sistema
-- Para casos onde o sistema precisa logar sem usuário
-- ============================================

CREATE OR REPLACE FUNCTION public.log_system_activity(
  activity_type text,
  activity_description text,
  system_user_id uuid DEFAULT NULL,
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  v_role text;
BEGIN
  -- Apenas service_role pode chamar esta função
  v_role := auth.role();
  IF v_role != 'service_role' THEN
    RAISE EXCEPTION 'Only service role can log system activity';
  END IF;
  
  INSERT INTO public.user_activity_logs (
    user_id,
    activity_type,
    activity_description,
    metadata
  ) VALUES (
    system_user_id,
    activity_type,
    activity_description,
    metadata_param
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- ============================================
-- Auditoria
-- ============================================

INSERT INTO public.lgpd_audit (
  action_type,
  resource_type,
  legal_basis,
  purpose,
  data_accessed
) VALUES (
  'security_fix',
  'function',
  'legal_obligation',
  'Correção de vulnerabilidades SECURITY DEFINER (Fase 1)',
  jsonb_build_object(
    'fixed_functions', ARRAY['validate_calendar_token', 'log_user_activity', 'log_security_event'],
    'severity', 'critical',
    'timestamp', now()
  )
);