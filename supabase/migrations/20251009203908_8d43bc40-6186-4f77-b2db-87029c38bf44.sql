-- Adjust knowledge_index embedding dimension to 1536 for OpenAI text-embedding-3-small
-- Drop existing embedding indexes if any, alter column type, and recreate HNSW index

-- Drop indexes if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'knowledge_index_embedding_hnsw'
  ) THEN
    EXECUTE 'DROP INDEX public.knowledge_index_embedding_hnsw';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'knowledge_index_embedding_idx'
  ) THEN
    EXECUTE 'DROP INDEX public.knowledge_index_embedding_idx';
  END IF;
END $$;

-- Alter the column type to vector(1536)
ALTER TABLE public.knowledge_index
ALTER COLUMN embedding TYPE vector(1536);

-- Recreate HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS knowledge_index_embedding_hnsw
ON public.knowledge_index
USING hnsw (embedding vector_l2_ops);
