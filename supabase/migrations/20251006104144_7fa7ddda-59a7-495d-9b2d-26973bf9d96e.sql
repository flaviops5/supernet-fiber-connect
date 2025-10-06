-- ============================================
-- CRIAR ACTION_LOG PRIMEIRO (se não existe)
-- ============================================

CREATE TABLE IF NOT EXISTS public.action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  client_cpf text,
  action_type text NOT NULL,
  action_payload jsonb,
  ixcticket_id text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_log_agent_name ON public.action_log(agent_name);
CREATE INDEX IF NOT EXISTS idx_action_log_client_cpf ON public.action_log(client_cpf);
CREATE INDEX IF NOT EXISTS idx_action_log_created_at ON public.action_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.action_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view action_log"
  ON public.action_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage action_log"
  ON public.action_log FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));