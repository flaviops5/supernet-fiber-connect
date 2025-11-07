-- Add missing flow state columns used by support-tech-agent
ALTER TABLE public.agent_flow_states
ADD COLUMN IF NOT EXISTS "continue" text,
ADD COLUMN IF NOT EXISTS loop_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS recent_messages jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Helpful index for updated_at and conversation usage (optional but safe)
CREATE INDEX IF NOT EXISTS idx_agent_flow_states_conversation_updated
ON public.agent_flow_states (conversation_id, updated_at DESC);