-- Adicionar campos de tools e media nas tabelas de fluxo
-- Tabela: agent_flow_subjects
ALTER TABLE public.agent_flow_subjects
ADD COLUMN IF NOT EXISTS default_tools jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS default_media jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.agent_flow_subjects.default_tools IS 'Tools padrão que serão aplicadas a todos os steps deste subject (pode ser sobrescrita por step)';
COMMENT ON COLUMN public.agent_flow_subjects.default_media IS 'Mídias padrão que serão exibidas em todos os steps deste subject (pode ser sobrescrita por step)';

-- Tabela: agent_flow_steps
ALTER TABLE public.agent_flow_steps
ADD COLUMN IF NOT EXISTS step_tools jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS step_media jsonb DEFAULT NULL;

COMMENT ON COLUMN public.agent_flow_steps.step_tools IS 'Tools específicas deste step (sobrescreve default_tools do subject se definido)';
COMMENT ON COLUMN public.agent_flow_steps.step_media IS 'Mídias específicas deste step (sobrescreve default_media do subject se definido)';

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_agent_flow_subjects_tools ON public.agent_flow_subjects USING gin(default_tools);
CREATE INDEX IF NOT EXISTS idx_agent_flow_steps_tools ON public.agent_flow_steps USING gin(step_tools);

-- Exemplo de configuração para ENERGIA (subject)
UPDATE public.agent_flow_subjects
SET default_tools = '["test-equipment-connectivity", "criar_atendimento_ixc"]'::jsonb
WHERE subject_key = 'ENERGIA' AND agent_type = 'support-tech-agent';

-- Exemplo: step específico pode sobrescrever
-- UPDATE public.agent_flow_steps
-- SET step_tools = '["test-equipment-connectivity"]'::jsonb
-- WHERE step_key = 'ENERGIA_STEP_1' AND agent_type = 'support-tech-agent';