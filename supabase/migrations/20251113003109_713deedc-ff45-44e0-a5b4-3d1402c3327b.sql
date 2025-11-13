-- ============================================================================
-- Migration: Fix SECURITY DEFINER functions without SET search_path
-- ACT-003: Proteção contra Schema Hijacking
-- Data: 2025-11-13
-- ============================================================================

-- ===========================================================================
-- 1. anonymize_old_conversations() - CRÍTICO (Dados LGPD)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.anonymize_old_conversations()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'  -- ✅ ADICIONADO
AS $function$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Anonimizar conversas com mais de 90 dias
  UPDATE public.conversations
  SET 
    customer_name = '[ANONIMIZADO]',
    customer_email = NULL,
    customer_phone = '[ANONIMIZADO]',
    customer_cpf = NULL,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{anonymized}',
      'true'::jsonb
    ),
    metadata = jsonb_set(
      metadata,
      '{anonymized_at}',
      to_jsonb(NOW())
    )
  WHERE 
    created_at < (NOW() - interval '90 days')
    AND customer_name != '[ANONIMIZADO]'
    AND (opt_out_requested = true OR lgpd_consent = false);
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Registrar na auditoria
  INSERT INTO public.lgpd_audit (
    action_type,
    resource_type,
    legal_basis,
    purpose,
    data_accessed
  ) VALUES (
    'anonymize',
    'conversation',
    'legal_obligation',
    'Anonimização automática após 90 dias (LGPD Art. 16)',
    jsonb_build_object('affected_count', affected_count)
  );
  
  RETURN affected_count;
END;
$function$;

COMMENT ON FUNCTION public.anonymize_old_conversations() IS 
'[ACT-003 FIX] Protegido contra schema hijacking. Anonimiza conversas antigas conforme LGPD.';

-- ===========================================================================
-- 2. disable_maintenance_cron() - ALTO (Disponibilidade)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.disable_maintenance_cron()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'  -- ✅ ADICIONADO
AS $function$
DECLARE
  v_cron_name TEXT;
BEGIN
  SELECT cron_name 
  INTO v_cron_name
  FROM public.maintenance_cron_control
  LIMIT 1;
  
  PERFORM cron.unschedule(v_cron_name);
  
  UPDATE public.maintenance_cron_control
  SET is_active = false,
      last_disabled_at = now(),
      updated_at = now();
END;
$function$;

COMMENT ON FUNCTION public.disable_maintenance_cron() IS 
'[ACT-003 FIX] Protegido contra schema hijacking. Desabilita cron de manutenção de rede.';

-- ===========================================================================
-- 3. enable_maintenance_cron() - ALTO (Disponibilidade)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.enable_maintenance_cron()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'  -- ✅ ADICIONADO
AS $function$
DECLARE
  v_cron_name TEXT;
  v_cron_schedule TEXT;
BEGIN
  SELECT cron_name, cron_schedule 
  INTO v_cron_name, v_cron_schedule
  FROM public.maintenance_cron_control
  LIMIT 1;

  PERFORM cron.unschedule(v_cron_name);
  
  PERFORM cron.schedule(
    v_cron_name,
    v_cron_schedule,
    $cron$
    SELECT net.http_post(
      url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/network-maintenance-executor',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHVwa2JweGpjZnhkZ3J3a25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTg4ODYsImV4cCI6MjA3NDMzNDg4Nn0.np4wHopAwI7HOTsYPaAUSWbe_qVxMBSIHjYv4PnKL6I"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
    $cron$
  );
  
  UPDATE public.maintenance_cron_control
  SET is_active = true,
      last_enabled_at = now(),
      updated_at = now();
END;
$function$;

COMMENT ON FUNCTION public.enable_maintenance_cron() IS 
'[ACT-003 FIX] Protegido contra schema hijacking. Habilita cron de manutenção de rede.';

-- ===========================================================================
-- 4. mask_cpf_before_insert() - CRÍTICO (Dados LGPD)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.mask_cpf_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'  -- ✅ ADICIONADO
AS $function$
BEGIN
  IF NEW.customer_cpf IS NOT NULL THEN
    NEW.customer_cpf := '***.***.***-' || RIGHT(REGEXP_REPLACE(NEW.customer_cpf, '[^0-9]', '', 'g'), 2);
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.mask_cpf_before_insert() IS 
'[ACT-003 FIX] Protegido contra schema hijacking. Mascara CPF antes de insert para conformidade LGPD.';

-- ===========================================================================
-- Validação da Correção
-- ===========================================================================

DO $$
DECLARE
  vulnerable_count INTEGER;
BEGIN
  -- Contar funções SECURITY DEFINER sem search_path
  SELECT COUNT(*) INTO vulnerable_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (
      proconfig IS NULL 
      OR NOT ('search_path' = ANY(
        SELECT split_part(unnest(proconfig), '=', 1)
      ))
    );
  
  IF vulnerable_count > 0 THEN
    RAISE WARNING 'ACT-003: Ainda existem % funções vulneráveis!', vulnerable_count;
  ELSE
    RAISE NOTICE 'ACT-003: ✅ Todas as funções SECURITY DEFINER estão protegidas com search_path';
  END IF;
END $$;