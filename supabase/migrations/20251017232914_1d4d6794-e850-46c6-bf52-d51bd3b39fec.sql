-- Tabela para armazenar simulações de fluxos de conversação
CREATE TABLE IF NOT EXISTS public.flow_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  simulation_name TEXT NOT NULL,
  conversation_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  responses_chosen JSONB NOT NULL DEFAULT '[]'::jsonb,
  conversation_transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_steps INTEGER NOT NULL DEFAULT 0,
  estimated_duration_seconds INTEGER,
  quality_score FLOAT,
  issues_detected JSONB DEFAULT '[]'::jsonb,
  suggestions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index para buscar por agente
CREATE INDEX IF NOT EXISTS idx_flow_simulations_agent_type 
ON public.flow_simulations(agent_type);

-- Index para buscar por score
CREATE INDEX IF NOT EXISTS idx_flow_simulations_quality_score 
ON public.flow_simulations(quality_score DESC);

-- RLS Policies
ALTER TABLE public.flow_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage simulations"
ON public.flow_simulations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Editors can view simulations"
ON public.flow_simulations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
  )
);