-- Adicionar colunas faltantes em kb_scenarios
ALTER TABLE public.kb_scenarios 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 1.0;

-- Criar índices auxiliares
CREATE INDEX IF NOT EXISTS idx_kb_scenarios_cat ON public.kb_scenarios (category);
CREATE INDEX IF NOT EXISTS idx_kb_scenarios_expected ON public.kb_scenarios (expected_agent);
CREATE INDEX IF NOT EXISTS idx_kb_scenarios_active ON public.kb_scenarios (is_active);

-- Criar tabela de resultados dos testes LLM
CREATE TABLE IF NOT EXISTS public.llm_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid REFERENCES public.kb_scenarios(id),
  category text NOT NULL,
  scenario text NOT NULL,
  expected_agent text,
  detected_agent text,
  model_generation text,
  model_evaluator text,
  endpoint_called text,
  routing_score numeric,
  clarity_score numeric,
  context_score numeric,
  tone_score numeric,
  timing_score numeric,
  pass boolean,
  confidence numeric,
  response text,
  user_message text,
  evaluation text,
  error_details text,
  latency_ms integer,
  execution_time_ms integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índices para llm_test_results
CREATE INDEX IF NOT EXISTS idx_llm_test_results_cat ON public.llm_test_results (category);
CREATE INDEX IF NOT EXISTS idx_llm_test_results_expected ON public.llm_test_results (expected_agent);
CREATE INDEX IF NOT EXISTS idx_llm_test_results_created ON public.llm_test_results (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_test_results_pass ON public.llm_test_results (pass);

-- Atualizar cenários existentes para estarem ativos
UPDATE public.kb_scenarios SET is_active = true WHERE is_active IS NULL;

-- RLS para llm_test_results
ALTER TABLE public.llm_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver resultados de testes LLM"
ON public.llm_test_results FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'editor')
  )
);

CREATE POLICY "Service role pode inserir resultados de testes"
ON public.llm_test_results FOR INSERT
TO service_role
WITH CHECK (true);