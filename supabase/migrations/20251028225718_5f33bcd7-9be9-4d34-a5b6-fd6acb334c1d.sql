-- PR #13 FIX — agent_flow_states (flow-state persistence)
CREATE TABLE IF NOT EXISTS public.agent_flow_states (
  conversation_id text PRIMARY KEY,
  waiting_step text,
  last_agent_question text,
  scenario_started text,
  context_warnings int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flow_states_conversation_id
  ON public.agent_flow_states(conversation_id);

-- Enable RLS
ALTER TABLE public.agent_flow_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies (agents podem gerenciar seus próprios flow states)
CREATE POLICY "Agents can view flow states"
  ON public.agent_flow_states
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'editor'::user_role)
  );

CREATE POLICY "System can insert flow states"
  ON public.agent_flow_states
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update flow states"
  ON public.agent_flow_states
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE public.agent_flow_states IS 'PR #13 - Armazena estado de fluxo conversacional para prevenir fuga de contexto e loops infinitos';