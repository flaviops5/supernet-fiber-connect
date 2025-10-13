-- ===============================================================
-- Tabela: responsaveis_alerta
-- Cadastro de responsáveis para receber alertas de quedas em massa
-- ===============================================================

CREATE TABLE IF NOT EXISTS public.responsaveis_alerta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  funcao TEXT NOT NULL,
  tipo_evento TEXT NOT NULL DEFAULT 'mass_outage',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_responsaveis_alerta_ativo ON public.responsaveis_alerta(ativo);
CREATE INDEX IF NOT EXISTS idx_responsaveis_alerta_tipo_evento ON public.responsaveis_alerta(tipo_evento);

-- RLS Policies
ALTER TABLE public.responsaveis_alerta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar responsáveis"
  ON public.responsaveis_alerta
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors podem visualizar responsáveis ativos"
  ON public.responsaveis_alerta
  FOR SELECT
  USING (ativo = true AND (has_role(auth.uid(), 'editor'::user_role) OR has_role(auth.uid(), 'admin'::user_role)));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_responsaveis_alerta_updated_at
  BEFORE UPDATE ON public.responsaveis_alerta
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir responsáveis padrão (exemplo)
INSERT INTO public.responsaveis_alerta (nome, telefone, funcao, tipo_evento, ativo)
VALUES 
  ('Gerente de Rede', '5561999999999', 'Gerente', 'mass_outage', true),
  ('Técnico de Campo 1', '5561988888888', 'Técnico', 'mass_outage', true)
ON CONFLICT DO NOTHING;