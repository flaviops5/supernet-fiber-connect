-- Add alerted_at column for monitoring_logs if missing and supporting index
ALTER TABLE public.monitoring_logs
  ADD COLUMN IF NOT EXISTS alerted_at TIMESTAMPTZ NULL;

-- Composite index to speed up alert scan queries
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_level_alerted_ts
  ON public.monitoring_logs (level, alerted_at, log_timestamp DESC);
