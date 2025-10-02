-- Criar tabela de configurações de email
CREATE TABLE IF NOT EXISTS public.email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_from_email TEXT NOT NULL DEFAULT 'contato@supernet.com.br',
  default_from_name TEXT NOT NULL DEFAULT 'SUPERNET FIBRA',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Admins e Editors podem gerenciar
CREATE POLICY "Admins podem gerenciar configurações de email"
  ON public.email_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors podem gerenciar configurações de email"
  ON public.email_settings
  FOR ALL
  USING (has_role(auth.uid(), 'editor'));

-- Inserir configuração padrão
INSERT INTO public.email_settings (default_from_email, default_from_name)
VALUES ('contato@supernet.com.br', 'SUPERNET FIBRA')
ON CONFLICT DO NOTHING;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();