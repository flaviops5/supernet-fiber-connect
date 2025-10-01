-- Add folder structure and multi-agent support to knowledge_base
ALTER TABLE public.knowledge_base
ADD COLUMN parent_id uuid REFERENCES public.knowledge_base(id) ON DELETE CASCADE,
ADD COLUMN is_folder boolean NOT NULL DEFAULT false,
ADD COLUMN display_order integer NOT NULL DEFAULT 0,
ADD COLUMN agent_types text[] DEFAULT '{}';

-- Migrate existing agent_type data to agent_types array
UPDATE public.knowledge_base
SET agent_types = CASE
  WHEN agent_type IS NULL THEN '{}'::text[]
  ELSE ARRAY[agent_type]::text[]
END;

-- Drop old agent_type column
ALTER TABLE public.knowledge_base
DROP COLUMN agent_type;

-- Create indexes for better query performance
CREATE INDEX idx_knowledge_base_parent_id ON public.knowledge_base(parent_id);
CREATE INDEX idx_knowledge_base_agent_types ON public.knowledge_base USING GIN(agent_types);
CREATE INDEX idx_knowledge_base_is_folder ON public.knowledge_base(is_folder);
CREATE INDEX idx_knowledge_base_display_order ON public.knowledge_base(display_order);

-- Create index for hierarchical queries
CREATE INDEX idx_knowledge_base_hierarchy ON public.knowledge_base(parent_id, is_folder, display_order);

COMMENT ON COLUMN public.knowledge_base.parent_id IS 'Parent folder ID for hierarchical organization';
COMMENT ON COLUMN public.knowledge_base.is_folder IS 'True if this is a folder, false if content';
COMMENT ON COLUMN public.knowledge_base.display_order IS 'Order for sorting within parent folder';
COMMENT ON COLUMN public.knowledge_base.agent_types IS 'Array of agent types that can access this content. Empty array means all agents';