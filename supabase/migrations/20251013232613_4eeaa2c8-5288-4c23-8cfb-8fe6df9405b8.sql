-- ================================================================
-- 📋 TABELA: monitoring_logs (versão final otimizada)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.monitoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by TEXT
);

-- 🔍 Índices
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_source ON public.monitoring_logs(source);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_level ON public.monitoring_logs(level);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_created_at ON public.monitoring_logs(created_at DESC);

-- 🔐 RLS
ALTER TABLE public.monitoring_logs ENABLE ROW LEVEL SECURITY;

-- ✅ Políticas de acesso
CREATE POLICY "Admins podem ler logs"
  ON public.monitoring_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service role pode inserir logs"
  ON public.monitoring_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 🧹 LIMPEZA AUTOMÁTICA DE LOGS (90 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.monitoring_logs
  WHERE created_at < now() - interval '90 days';
END;
$$;