-- ===================================================
-- CORREÇÕES CRÍTICAS: Mass Outage Detection System
-- ===================================================

-- 1. Adicionar unique constraint para event_key (necessário para UPSERT)
ALTER TABLE public.mass_outage_events 
DROP CONSTRAINT IF EXISTS mass_outage_events_event_key_key;

ALTER TABLE public.mass_outage_events 
ADD CONSTRAINT mass_outage_events_event_key_key UNIQUE (event_key);

-- 2. Criar índice para melhorar performance em queries por status
CREATE INDEX IF NOT EXISTS idx_mass_outage_events_status 
ON public.mass_outage_events(status);

CREATE INDEX IF NOT EXISTS idx_mass_outage_events_created_at 
ON public.mass_outage_events(created_at DESC);

-- 3. Configurar cron job para detecção de quedas em massa (a cada 5 minutos)
-- IMPORTANTE: Usando service role key guardada como secret (não anon key)
SELECT cron.unschedule('detect-mass-outage-job') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'detect-mass-outage-job');

SELECT cron.schedule(
  'detect-mass-outage-job',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT
    net.http_post(
        url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/detect-mass-outage',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- 4. Comentário explicativo
COMMENT ON TABLE public.mass_outage_events IS 
'Tabela de eventos de queda em massa. UPSERT é seguro via constraint unique em event_key.';

COMMENT ON CONSTRAINT mass_outage_events_event_key_key ON public.mass_outage_events IS 
'Constraint única para permitir UPSERT seguro e evitar race conditions em detecções paralelas.';