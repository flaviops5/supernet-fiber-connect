-- Add agent_type column to knowledge_base table
ALTER TABLE public.knowledge_base 
ADD COLUMN agent_type TEXT NULL;

-- Add index for better query performance
CREATE INDEX idx_knowledge_base_agent_type ON public.knowledge_base(agent_type);

-- Add comment explaining the column
COMMENT ON COLUMN public.knowledge_base.agent_type IS 'Specific agent type this knowledge is for (routing, sales, support_financial, support_tech). NULL means available to all agents.';