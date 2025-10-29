-- PR #15: Adicionar índice para last_agent_question na tabela agent_flow_states
-- Melhora performance de consultas que usam este campo para contexto

CREATE INDEX IF NOT EXISTS idx_agent_flow_states_last_question 
ON public.agent_flow_states(conversation_id, last_agent_question) 
WHERE last_agent_question IS NOT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.agent_flow_states.last_agent_question IS 
'Última pergunta feita pelo agente ao cliente. Usado para recuperar contexto em caso de fuga de fluxo (PR #15 - textReplyWithContext)';