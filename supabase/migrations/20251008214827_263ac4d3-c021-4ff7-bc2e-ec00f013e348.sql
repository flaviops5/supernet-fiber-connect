-- ===================================================
-- CORREÇÃO: Cron job com service role key correto
-- ===================================================

-- Remover cron job anterior
SELECT cron.unschedule('detect-mass-outage-job') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'detect-mass-outage-job');

-- Recriar cron job usando service role key do Supabase
-- NOTA: O service role key é acessível via variáveis de ambiente do Supabase
SELECT cron.schedule(
  'detect-mass-outage-job',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT
    net.http_post(
        url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/detect-mass-outage',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHVwa2JweGpjZnhkZ3J3a25wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc1ODg4NiwiZXhwIjoyMDc0MzM0ODg2fQ.iCxL7JxIXj4bwDdXSlx8NyKhp_JGp9n_gLaKTqwS5YA'
        ),
        body:='{}'::jsonb
    ) as request_id;
  $$
);