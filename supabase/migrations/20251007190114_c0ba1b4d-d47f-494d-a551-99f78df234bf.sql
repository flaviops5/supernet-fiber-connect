-- Criar tabela para controlar o cron job
CREATE TABLE IF NOT EXISTS public.maintenance_cron_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name TEXT NOT NULL DEFAULT 'network-maintenance-executor',
  cron_schedule TEXT NOT NULL DEFAULT '*/5 * * * *',
  is_active BOOLEAN NOT NULL DEFAULT false,
  last_enabled_at TIMESTAMP WITH TIME ZONE,
  last_disabled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.maintenance_cron_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar cron control"
ON public.maintenance_cron_control FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

INSERT INTO public.maintenance_cron_control (is_active) VALUES (false) ON CONFLICT DO NOTHING;

CREATE TRIGGER update_maintenance_cron_control_updated_at
BEFORE UPDATE ON public.maintenance_cron_control
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para habilitar o cron job
CREATE OR REPLACE FUNCTION enable_maintenance_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Função para desabilitar o cron job
CREATE OR REPLACE FUNCTION disable_maintenance_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;