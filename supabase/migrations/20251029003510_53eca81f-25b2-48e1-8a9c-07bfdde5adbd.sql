-- PR #13: Adicionar coluna transferred_to_human à tabela agent_flow_states
-- Esta coluna rastreia quando um fluxo foi transferido para atendimento humano

ALTER TABLE public.agent_flow_states 
ADD COLUMN IF NOT EXISTS transferred_to_human BOOLEAN DEFAULT false;

-- Adicionar índice para melhorar consultas
CREATE INDEX IF NOT EXISTS idx_agent_flow_states_transferred 
ON public.agent_flow_states(transferred_to_human) 
WHERE transferred_to_human = true;

-- Comentário para documentação
COMMENT ON COLUMN public.agent_flow_states.transferred_to_human IS 
'Indica se o fluxo foi transferido para atendimento humano (PR #13 - Anti-Fuga de Fluxo)';