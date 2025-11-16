-- ============================================
-- FASE 1: Adicionar Admin Check em Maintenance Cron
-- ============================================

-- Corrigir enable_maintenance_cron para exigir admin
CREATE OR REPLACE FUNCTION public.enable_maintenance_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cron_name TEXT;
  v_cron_schedule TEXT;
BEGIN
  -- 🔒 SECURITY: Apenas admins podem ativar cron de manutenção
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required to enable maintenance cron';
  END IF;

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
  
  -- Log da ativação
  PERFORM public.log_security_event(
    'maintenance_cron_enabled',
    'Maintenance cron job enabled by admin',
    jsonb_build_object('cron_name', v_cron_name, 'schedule', v_cron_schedule),
    'info'
  );
END;
$function$;

-- Corrigir disable_maintenance_cron para exigir admin
CREATE OR REPLACE FUNCTION public.disable_maintenance_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cron_name TEXT;
BEGIN
  -- 🔒 SECURITY: Apenas admins podem desativar cron de manutenção
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required to disable maintenance cron';
  END IF;

  SELECT cron_name 
  INTO v_cron_name
  FROM public.maintenance_cron_control
  LIMIT 1;
  
  PERFORM cron.unschedule(v_cron_name);
  
  UPDATE public.maintenance_cron_control
  SET is_active = false,
      last_disabled_at = now(),
      updated_at = now();
  
  -- Log da desativação
  PERFORM public.log_security_event(
    'maintenance_cron_disabled',
    'Maintenance cron job disabled by admin',
    jsonb_build_object('cron_name', v_cron_name),
    'info'
  );
END;
$function$;

-- Comentários de documentação
COMMENT ON FUNCTION public.enable_maintenance_cron() IS 
'Ativa o cron job de manutenção de rede. REQUER ROLE ADMIN. Usa SECURITY DEFINER para acessar cron.schedule().';

COMMENT ON FUNCTION public.disable_maintenance_cron() IS 
'Desativa o cron job de manutenção de rede. REQUER ROLE ADMIN. Usa SECURITY DEFINER para acessar cron.unschedule().';