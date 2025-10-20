-- Adicionar constraint única para permitir upsert de aprovações de variações
ALTER TABLE agent_flow_scenario_approvals 
ADD CONSTRAINT agent_flow_scenario_approvals_unique 
UNIQUE (agent_type, subject_key, scenario_key, variation_path);