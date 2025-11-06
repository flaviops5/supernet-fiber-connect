-- PR Hotfix: Add missing column used by support-tech-agent flow state
-- This adds the column referenced by updateFlowState to prevent PGRST204 errors
ALTER TABLE public.agent_flow_states
ADD COLUMN IF NOT EXISTS hybrid_mode_active boolean NOT NULL DEFAULT false;

-- Optional safety: ensure updated_at exists for merge semantics used by helper
ALTER TABLE public.agent_flow_states
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
