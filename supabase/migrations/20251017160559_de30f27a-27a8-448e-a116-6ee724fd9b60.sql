-- Criar enum para tipos de agente
CREATE TYPE agent_type AS ENUM (
  'routing-agent',
  'support-tech-agent',
  'support-financial-agent',
  'sales-agent',
  'telemedicina-agent',
  'automacao-agent',
  'logistics-agent'
);

-- Adicionar coluna agent_type à tabela tech_flow_steps
ALTER TABLE public.tech_flow_steps
ADD COLUMN agent_type agent_type NOT NULL DEFAULT 'support-tech-agent';

-- Atualizar registros existentes para serem do tipo support-tech-agent
UPDATE public.tech_flow_steps
SET agent_type = 'support-tech-agent';

-- Renomear a tabela para agent_flow_steps
ALTER TABLE public.tech_flow_steps
RENAME TO agent_flow_steps;

-- Criar índice para melhorar performance de queries filtradas por agent_type
CREATE INDEX idx_agent_flow_steps_agent_type ON public.agent_flow_steps(agent_type);

-- Atualizar comentário da tabela
COMMENT ON TABLE public.agent_flow_steps IS 'Fluxos conversacionais para diferentes agentes de IA';