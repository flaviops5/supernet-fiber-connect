-- Adiciona coluna para armazenar as mensagens aprovadas das simulações
ALTER TABLE agent_flow_scenario_approvals
ADD COLUMN approved_messages JSONB DEFAULT '[]'::jsonb;

-- Adiciona índice para buscar variações aprovadas por agente + assunto
CREATE INDEX idx_scenario_approvals_agent_subject_status 
ON agent_flow_scenario_approvals(agent_type, subject_key, status, updated_at DESC)
WHERE status = 'approved';

-- Comentário explicativo
COMMENT ON COLUMN agent_flow_scenario_approvals.approved_messages IS 
'Array de mensagens da conversação aprovada no formato: [{ role: "assistant"|"user", content: "texto" }]';