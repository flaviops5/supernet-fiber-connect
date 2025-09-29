-- Criar tabela para documentação IXC
CREATE TABLE public.ixc_documentation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  parameters JSONB DEFAULT '[]'::jsonb,
  request_body JSONB DEFAULT '{}'::jsonb,
  response_example JSONB DEFAULT '{}'::jsonb,
  content TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_ixc_documentation_endpoint ON public.ixc_documentation(endpoint);
CREATE INDEX idx_ixc_documentation_method ON public.ixc_documentation(method);
CREATE INDEX idx_ixc_documentation_category ON public.ixc_documentation(category);
CREATE INDEX idx_ixc_documentation_tags ON public.ixc_documentation USING GIN(tags);
CREATE INDEX idx_ixc_documentation_active ON public.ixc_documentation(is_active);

-- Trigger para updated_at
CREATE TRIGGER update_ixc_documentation_updated_at
  BEFORE UPDATE ON public.ixc_documentation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.ixc_documentation ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar documentação
CREATE POLICY "Admins can manage IXC documentation"
  ON public.ixc_documentation
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Editors podem gerenciar documentação
CREATE POLICY "Editors can manage IXC documentation"
  ON public.ixc_documentation
  FOR ALL
  USING (has_role(auth.uid(), 'editor'::user_role));

-- Documentação ativa é publicamente legível
CREATE POLICY "Active IXC documentation is publicly readable"
  ON public.ixc_documentation
  FOR SELECT
  USING (is_active = true);