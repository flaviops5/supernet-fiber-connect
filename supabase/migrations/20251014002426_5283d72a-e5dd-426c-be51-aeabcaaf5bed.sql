-- ===================================================================
-- 🧠 ATLAS ANALYZER 2.0 — MIGRATION COMPLETA (CORRIGIDA)
-- ===================================================================

-- ==============================================================
-- 1️⃣ TABELA atlas_insights (se não existir)
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.atlas_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeframe_minutes INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  probable_cause TEXT NOT NULL,
  kpis JSONB DEFAULT '{}'::jsonb,
  groups TEXT[] DEFAULT '{}',
  recommendation TEXT NOT NULL,
  notifications JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.atlas_insights ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_atlas_insights_created_at ON public.atlas_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_atlas_insights_severity ON public.atlas_insights(severity);
CREATE INDEX IF NOT EXISTS idx_atlas_insights_cause ON public.atlas_insights(probable_cause);

-- ==============================================================
-- 2️⃣ TABELA atlas_config (configuração dinâmica)
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.atlas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thresholds JSONB NOT NULL DEFAULT '{"errors_per_min":{"LOW":2,"MEDIUM":5,"HIGH":10}}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.atlas_config ENABLE ROW LEVEL SECURITY;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_atlas_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS atlas_config_updated_at ON public.atlas_config;
CREATE TRIGGER atlas_config_updated_at
  BEFORE UPDATE ON public.atlas_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_atlas_config_timestamp();

-- Política RLS
DROP POLICY IF EXISTS "Service role can manage atlas_config" ON public.atlas_config;
CREATE POLICY "Service role can manage atlas_config"
  ON public.atlas_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage atlas_config" ON public.atlas_config;
CREATE POLICY "Admins can manage atlas_config"
  ON public.atlas_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Inserir configuração padrão
INSERT INTO public.atlas_config (thresholds)
SELECT '{"errors_per_min":{"LOW":2,"MEDIUM":5,"HIGH":10}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.atlas_config);

-- ==============================================================
-- 3️⃣ TABELA responsaveis_alerta
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.responsaveis_alerta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  funcao TEXT NOT NULL,
  tipo_evento TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.responsaveis_alerta ENABLE ROW LEVEL SECURITY;

-- Índice
CREATE INDEX IF NOT EXISTS idx_responsaveis_tipo_ativo ON public.responsaveis_alerta(tipo_evento, ativo) WHERE ativo = true;

-- Políticas RLS
DROP POLICY IF EXISTS "Admins can manage responsaveis_alerta" ON public.responsaveis_alerta;
CREATE POLICY "Admins can manage responsaveis_alerta"
  ON public.responsaveis_alerta
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Service role can read responsaveis" ON public.responsaveis_alerta;
CREATE POLICY "Service role can read responsaveis"
  ON public.responsaveis_alerta
  FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Editors can view responsaveis_alerta" ON public.responsaveis_alerta;
CREATE POLICY "Editors can view responsaveis_alerta"
  ON public.responsaveis_alerta
  FOR SELECT
  USING (has_role(auth.uid(), 'editor'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Inserir responsáveis de exemplo (AJUSTE OS TELEFONES REAIS)
INSERT INTO public.responsaveis_alerta (nome, telefone, funcao, tipo_evento) VALUES
('Gerente de Rede', '5561912345678', 'Gerente NOC', 'mass_outage'),
('Coordenador Técnico', '5561987654321', 'Coordenador', 'mass_outage'),
('Plantão 24h', '5561900000000', 'Técnico Plantão', 'mass_outage')
ON CONFLICT DO NOTHING;

-- ==============================================================
-- 4️⃣ POLÍTICAS PARA atlas_insights
-- ==============================================================
DROP POLICY IF EXISTS "Admins e editores podem ver insights" ON public.atlas_insights;
CREATE POLICY "Admins e editores podem ver insights"
  ON public.atlas_insights
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'editor'::user_role));

DROP POLICY IF EXISTS "Service role pode inserir insights" ON public.atlas_insights;
CREATE POLICY "Service role pode inserir insights"
  ON public.atlas_insights
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role pode atualizar insights" ON public.atlas_insights;
CREATE POLICY "Service role pode atualizar insights"
  ON public.atlas_insights
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================
-- 5️⃣ POLÍTICAS PARA monitoring_logs (se já não existir)
-- ==============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monitoring_logs' 
    AND policyname = 'Service role pode inserir logs'
  ) THEN
    CREATE POLICY "Service role pode inserir logs"
      ON public.monitoring_logs
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================
-- 6️⃣ FUNÇÃO DE LIMPEZA (já existe, garantir que está atualizada)
-- ==============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.monitoring_logs
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- ==============================================================
-- 7️⃣ CRON JOB (pg_cron) - EXECUTAR MANUALMENTE APÓS AJUSTE
-- ==============================================================
-- ⚠️ ATENÇÃO: Descomente e ajuste os valores antes de executar:
-- 
-- SELECT cron.unschedule('atlas-analyzer-15min');
-- 
-- SELECT cron.schedule(
--   'atlas-analyzer-15min',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/atlas-analyzer',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
--     body:='{"windowMinutes":90}'::jsonb
--   );
--   $$
-- );
--
-- Substitua o token Bearer pelo SUPABASE_SERVICE_ROLE_KEY real