-- Ensure knowledge_base supports upsert on `source`
-- 1) Create a unique index on `source` so ON CONFLICT (source) works
CREATE UNIQUE INDEX IF NOT EXISTS ux_knowledge_base_source ON public.knowledge_base (source);
