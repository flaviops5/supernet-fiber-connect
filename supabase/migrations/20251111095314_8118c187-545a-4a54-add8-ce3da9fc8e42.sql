-- Corrigir dimensão dos embeddings de 512 para 1536 (OpenAI text-embedding-3-small)
-- CRITICAL: Deve dropar índice HNSW antes de alterar tipo da coluna

-- 1. Remover índice HNSW existente
DROP INDEX IF EXISTS public.idx_knowledge_embedding_hnsw;

-- 2. Alterar tipo da coluna embedding para 1536 dimensões
ALTER TABLE public.knowledge_index 
ALTER COLUMN embedding TYPE vector(1536);

-- 3. Recriar índice HNSW otimizado para 1536 dimensões
CREATE INDEX idx_knowledge_embedding_hnsw
ON public.knowledge_index
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Atualizar função match_knowledge para aceitar vector(1536)
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.5,
  top_k integer DEFAULT 5
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