-- Adicionar coluna 'source' para identificar origem dos documentos
ALTER TABLE public.knowledge_base 
ADD COLUMN IF NOT EXISTS source TEXT;

-- Criar índice único para source (permite upsert)
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_base_source 
ON public.knowledge_base(source) 
WHERE source IS NOT NULL;

-- Atualizar documentos existentes sem source
UPDATE public.knowledge_base 
SET source = CONCAT('legacy/', id::text)
WHERE source IS NULL;

COMMENT ON COLUMN public.knowledge_base.source IS 'Caminho de origem do documento (ex: docs/multiagent-architecture.md)';
