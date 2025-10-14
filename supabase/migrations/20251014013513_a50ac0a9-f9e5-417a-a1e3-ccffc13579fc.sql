-- Tabela para documentação técnica unificada (não vetorizada)
CREATE TABLE IF NOT EXISTS public.unified_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  doc_type TEXT NOT NULL, -- 'edge_function', 'markdown', 'diagram', 'config', 'guide'
  category TEXT, -- 'backend', 'frontend', 'infrastructure', 'guides'
  file_path TEXT, -- caminho original do arquivo (se aplicável)
  language TEXT, -- 'typescript', 'markdown', 'mermaid', 'json', etc
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES public.unified_documentation(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(content, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(category, '')), 'C')
  ) STORED
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_unified_docs_type ON public.unified_documentation(doc_type);
CREATE INDEX IF NOT EXISTS idx_unified_docs_category ON public.unified_documentation(category);
CREATE INDEX IF NOT EXISTS idx_unified_docs_search ON public.unified_documentation USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_unified_docs_tags ON public.unified_documentation USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_unified_docs_active ON public.unified_documentation(is_active) WHERE is_active = true;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_unified_docs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_unified_docs_timestamp
BEFORE UPDATE ON public.unified_documentation
FOR EACH ROW
EXECUTE FUNCTION update_unified_docs_timestamp();

-- RLS Policies
ALTER TABLE public.unified_documentation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar documentação"
ON public.unified_documentation
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editores podem ver documentação ativa"
ON public.unified_documentation
FOR SELECT
TO authenticated
USING (
  is_active = true AND 
  (has_role(auth.uid(), 'editor'::user_role) OR has_role(auth.uid(), 'admin'::user_role))
);