-- ============================================
-- CRON JOB PARA DLQ + HEALTH CHECK
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Job 1: Processar DLQ a cada 5 minutos
SELECT cron.schedule(
  'retry-failed-actions-job',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT
    net.http_post(
        url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/retry-failed-actions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHVwa2JweGpjZnhkZ3J3a25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTg4ODYsImV4cCI6MjA3NDMzNDg4Nn0.np4wHopAwI7HOTsYPaAUSWbe_qVxMBSIHjYv4PnKL6I"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Job 2: Health check a cada 1 minuto
SELECT cron.schedule(
  'system-health-check-job',
  '* * * * *', -- A cada 1 minuto
  $$
  SELECT
    net.http_post(
        url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Job 3: Limpar métricas antigas (> 30 dias)
SELECT cron.schedule(
  'cleanup-old-metrics-job',
  '0 2 * * *', -- Todo dia às 2h da manhã
  $$
  DELETE FROM public.agent_metrics 
  WHERE created_at < now() - interval '30 days';
  
  DELETE FROM public.alert_history 
  WHERE created_at < now() - interval '90 days' AND resolved_at IS NOT NULL;
  $$
);