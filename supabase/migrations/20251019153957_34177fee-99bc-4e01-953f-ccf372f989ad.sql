-- Criar tabela para armazenar aprovações de cenários
CREATE TABLE IF NOT EXISTS agent_flow_scenario_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type agent_type NOT NULL,
  scenario_key TEXT NOT NULL,
  variation_path TEXT NOT NULL, -- Caminho das opções (ex: "sim→nao→sim")
  status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'rejected')),
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_type, scenario_key, variation_path)
);

-- Índices para performance
CREATE INDEX idx_scenario_approvals_agent_scenario ON agent_flow_scenario_approvals(agent_type, scenario_key);
CREATE INDEX idx_scenario_approvals_status ON agent_flow_scenario_approvals(status);

-- RLS policies
ALTER TABLE agent_flow_scenario_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar aprovações de cenários"
  ON agent_flow_scenario_approvals
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editores podem visualizar e criar aprovações"
  ON agent_flow_scenario_approvals
  FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Editores podem inserir aprovações"
  ON agent_flow_scenario_approvals
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Editores podem atualizar aprovações"
  ON agent_flow_scenario_approvals
  FOR UPDATE
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_scenario_approvals_updated_at
  BEFORE UPDATE ON agent_flow_scenario_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();