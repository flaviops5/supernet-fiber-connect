-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing cron job if it exists
SELECT cron.unschedule('check-due-invoices-daily');

-- Create cron job to check invoices daily at 8:00 AM (Brazil time)
-- Runs every day at 8:00 AM
SELECT cron.schedule(
  'check-due-invoices-daily',
  '0 8 * * *', -- At 8:00 AM every day
  $$
  SELECT
    net.http_post(
        url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/check-due-invoices',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHVwa2JweGpjZnhkZ3J3a25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTg4ODYsImV4cCI6MjA3NDMzNDg4Nn0.np4wHopAwI7HOTsYPaAUSWbe_qVxMBSIHjYv4PnKL6I"}'::jsonb,
        body:='{"testMode": false}'::jsonb
    ) as request_id;
  $$
);

-- View scheduled cron jobs
SELECT * FROM cron.job WHERE jobname = 'check-due-invoices-daily';