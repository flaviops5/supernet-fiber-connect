-- ====================================
-- UNIFIED LOGGING SYSTEM
-- Criar ou ajustar tabela monitoring_logs
-- ====================================

-- Dropar tabela se existir (para garantir estrutura limpa)
DROP TABLE IF EXISTS public.monitoring_logs CASCADE;

-- Criar tabela do zero
CREATE TABLE public.monitoring_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_timestamp timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message text NOT NULL,
  context text NOT NULL,
  correlation_id text,
  environment text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices otimizados
CREATE INDEX idx_ml_log_timestamp ON public.monitoring_logs (log_timestamp DESC);
CREATE INDEX idx_ml_context ON public.monitoring_logs (context);
CREATE INDEX idx_ml_level ON public.monitoring_logs (level);
CREATE INDEX idx_ml_correlation ON public.monitoring_logs (correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_ml_created_at ON public.monitoring_logs (created_at DESC);

-- RLS Policies
ALTER TABLE public.monitoring_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all logs"
  ON public.monitoring_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors view logs"
  ON public.monitoring_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'editor'::user_role));

CREATE POLICY "Service inserts logs"
  ON public.monitoring_logs
  FOR INSERT
  WITH CHECK (true);

-- Função cleanup com retorno
CREATE OR REPLACE FUNCTION public.cleanup_monitoring_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.monitoring_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Comentários
COMMENT ON TABLE public.monitoring_logs IS 'Unified logging system for frontend and edge functions';
COMMENT ON COLUMN public.monitoring_logs.context IS 'Logger context (e.g., support-tech-agent, dashboard)';
COMMENT ON COLUMN public.monitoring_logs.correlation_id IS 'Request correlation ID for distributed tracing';
COMMENT ON COLUMN public.monitoring_logs.environment IS 'Runtime environment (dev, production)';
COMMENT ON COLUMN public.monitoring_logs.metadata IS 'Structured log metadata (PII sanitized)';