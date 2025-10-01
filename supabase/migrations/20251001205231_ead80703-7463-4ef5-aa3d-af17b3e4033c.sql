-- Habilitar extensões necessárias para Cron Jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar Cron Job para verificar faturas diariamente às 9h
SELECT cron.schedule(
  'check-due-invoices-daily',
  '0 9 * * *', -- Todos os dias às 9:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/check-due-invoices',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHVwa2JweGpjZnhkZ3J3a25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTg4ODYsImV4cCI6MjA3NDMzNDg4Nn0.np4wHopAwI7HOTsYPaAUSWbe_qVxMBSIHjYv4PnKL6I"}'::jsonb,
        body:='{"testMode": false}'::jsonb
    ) as request_id;
  $$
);

-- Para visualizar os cron jobs criados, execute:
-- SELECT * FROM cron.job;

-- Para remover o cron job (se necessário):
-- SELECT cron.unschedule('check-due-invoices-daily');