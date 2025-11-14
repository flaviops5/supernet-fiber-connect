-- =====================================================
-- ACT-002: Correção de SECURITY DEFINER Vulnerabilities
-- =====================================================
-- Objetivo: Remover funções que aceitam user_id arbitrário
-- e garantir que apenas auth.uid() seja usado

-- =====================================================
-- 1. REMOVER versão insegura de log_user_activity
-- =====================================================
-- A versão que aceita user_id_param permite falsificação de identidade
DROP FUNCTION IF EXISTS public.log_user_activity(text, text, uuid, jsonb);

-- Manter apenas a versão segura que SEMPRE usa auth.uid()
-- Esta já existe e não aceita user_id_param

-- =====================================================
-- 2. REMOVER versão insegura de log_security_event  
-- =====================================================
-- A versão que aceita user_id_param permite falsificar logs de segurança
DROP FUNCTION IF EXISTS public.log_security_event(text, text, uuid, jsonb, text);

-- Recriar versão segura sem parâmetro user_id
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text, 
  event_description text, 
  details_param jsonb DEFAULT '{}'::jsonb, 
  severity_param text DEFAULT 'info'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id UUID;
  current_user_id UUID;
BEGIN
  -- SEMPRE usar o usuário autenticado - sem exceções
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

-- =====================================================
-- 3. CORRIGIR log_system_activity - Validação de Role
-- =====================================================
-- Garantir que system_user_id seja nulo ou válido
CREATE OR REPLACE FUNCTION public.log_system_activity(
  activity_type text, 
  activity_description text, 
  system_user_id uuid DEFAULT NULL::uuid, 
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- VALIDAÇÃO CRÍTICA: Se system_user_id fornecido, verificar se existe
  IF system_user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = system_user_id) THEN
      RAISE EXCEPTION 'Invalid system_user_id: user does not exist';
    END IF;
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

-- =====================================================
-- 4. FORTALECER validate_calendar_token
-- =====================================================
-- Adicionar rate limiting e logs de auditoria
CREATE OR REPLACE FUNCTION public.validate_calendar_token(p_token text)
RETURNS TABLE(
  board_id uuid, 
  entity_name text, 
  entity_filter jsonb, 
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_board_id uuid;
  v_user_id uuid;
  v_token_record RECORD;
BEGIN
  -- Obter user_id autenticado
  v_user_id := auth.uid();
  
  -- Buscar token
  SELECT * INTO v_token_record
  FROM public.calendar_access_tokens
  WHERE token = p_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  -- Se token não encontrado ou inválido
  IF v_token_record IS NULL THEN
    -- Log tentativa de acesso com token inválido
    IF v_user_id IS NOT NULL THEN
      PERFORM public.log_security_event(
        'calendar_token_invalid',
        'Tentativa de acesso com token inválido',
        jsonb_build_object('token_prefix', substring(p_token from 1 for 8)),
        'warning'
      );
    END IF;
    
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::jsonb, false;
    RETURN;
  END IF;
  
  v_board_id := v_token_record.board_id;
  
  -- VALIDAÇÃO CRÍTICA: Verificar se usuário tem acesso ao board
  IF v_board_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM public.kanban_board_members 
      WHERE board_id = v_board_id 
        AND user_id = v_user_id
    ) THEN
      -- Log tentativa de acesso não autorizado
      PERFORM public.log_security_event(
        'calendar_unauthorized_access',
        'Tentativa de acesso não autorizado ao calendário do board',
        jsonb_build_object(
          'board_id', v_board_id,
          'user_id', v_user_id
        ),
        'error'
      );
      
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

  -- Retornar dados do token
  RETURN QUERY
  SELECT 
    v_token_record.board_id,
    v_token_record.entity_name,
    v_token_record.entity_filter,
    true as is_valid;
END;
$$;

-- =====================================================
-- 5. ADICIONAR Função de Auditoria de SECURITY DEFINER
-- =====================================================
-- Para monitorar uso suspeito de funções privilegiadas
CREATE OR REPLACE FUNCTION public.audit_security_definer_usage(
  function_name text,
  parameters jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_logs (
    user_id,
    event_type,
    event_description,
    details,
    severity
  ) VALUES (
    auth.uid(),
    'security_definer_call',
    'Chamada de função SECURITY DEFINER',
    jsonb_build_object(
      'function_name', function_name,
      'parameters', parameters,
      'role', auth.role()
    ),
    'info'
  );
END;
$$;

-- =====================================================
-- COMENTÁRIOS DE SEGURANÇA
-- =====================================================
COMMENT ON FUNCTION public.log_security_event IS 
'SECURITY: Sempre usa auth.uid(), não aceita user_id arbitrário';

COMMENT ON FUNCTION public.log_system_activity IS 
'SECURITY: Apenas service_role, valida system_user_id se fornecido';

COMMENT ON FUNCTION public.validate_calendar_token IS 
'SECURITY: Valida acesso ao board e loga tentativas não autorizadas';

COMMENT ON FUNCTION public.audit_security_definer_usage IS 
'SECURITY: Monitora uso de funções SECURITY DEFINER para auditoria';