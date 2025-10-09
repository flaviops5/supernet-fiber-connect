-- Habilitar extensão vector
CREATE EXTENSION IF NOT EXISTS vector;

-- Adicionar coluna de tracking na tabela antiga
ALTER TABLE public.knowledge_base 
ADD COLUMN IF NOT EXISTS migrated_at timestamptz;

-- Criar índice para filtrar não-migrados
CREATE INDEX IF NOT EXISTS idx_knowledge_base_migrated 
ON public.knowledge_base (migrated_at) 
WHERE migrated_at IS NULL;

-- Criar tabela vetorial otimizada
CREATE TABLE IF NOT EXISTS public.knowledge_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL DEFAULT 'knowledge_base',
  source_id uuid NOT NULL,
  title text,
  content text NOT NULL,
  summary text,
  category text,
  content_type text,
  tags text[],
  agent_types text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  embedding vector(512), -- text-embedding-3-small
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_source UNIQUE (source_table, source_id)
);

-- Índice HNSW para busca vetorial (otimizado para até 1M vetores)
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding_hnsw
ON public.knowledge_index
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON public.knowledge_index (source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON public.knowledge_index (category);
CREATE INDEX IF NOT EXISTS idx_knowledge_content_type ON public.knowledge_index (content_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON public.knowledge_index USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_agent_types ON public.knowledge_index USING GIN (agent_types);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_knowledge_index_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_knowledge_index_updated_at
BEFORE UPDATE ON public.knowledge_index
FOR EACH ROW
EXECUTE FUNCTION public.update_knowledge_index_timestamp();

-- Função de busca semântica (RPC)
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(512),
  top_k integer DEFAULT 5,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE(
  id uuid,
  source_id uuid,
  title text,
  content text,
  category text,
  content_type text,
  tags text[],
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT 
    id,
    source_id,
    title,
    content,
    category,
    content_type,
    tags,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.knowledge_index
  WHERE embedding IS NOT NULL
    AND (1 - (embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT top_k;
$$;

-- Função para obter estatísticas de migração
CREATE OR REPLACE FUNCTION public.get_migration_stats()
RETURNS TABLE(
  total_docs integer,
  migrated_docs integer,
  pending_docs integer,
  migration_progress numeric
)
LANGUAGE sql STABLE AS $$
  SELECT 
    COUNT(*)::integer as total_docs,
    COUNT(migrated_at)::integer as migrated_docs,
    COUNT(*) FILTER (WHERE migrated_at IS NULL)::integer as pending_docs,
    ROUND((COUNT(migrated_at)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) as migration_progress
  FROM public.knowledge_base
  WHERE is_active = true;
$$;

-- RLS policies para knowledge_index
ALTER TABLE public.knowledge_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Knowledge index is readable by authenticated users"
ON public.knowledge_index FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage knowledge index"
ON public.knowledge_index FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service role has full access to knowledge index"
ON public.knowledge_index FOR ALL
TO service_role
USING (true)
WITH CHECK (true);