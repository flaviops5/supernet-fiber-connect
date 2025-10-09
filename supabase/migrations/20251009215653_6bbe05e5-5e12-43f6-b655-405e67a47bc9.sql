-- Add missing metadata column to support GitHub sync payload
ALTER TABLE public.knowledge_base
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;