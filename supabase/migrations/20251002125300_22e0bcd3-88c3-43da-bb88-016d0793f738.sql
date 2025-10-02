-- Criar tabela para configurações da empresa
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'SUPERNET FIBRA',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#ef4444',
  secondary_color TEXT DEFAULT '#fb7185',
  phone TEXT,
  email TEXT,
  address TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO public.company_settings (company_name, logo_url)
VALUES ('SUPERNET FIBRA', '/assets/logo-supernet.png')
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Settings são públicas para leitura
CREATE POLICY "Company settings are publicly readable"
ON public.company_settings
FOR SELECT
USING (true);

-- Policy: Apenas admins podem atualizar
CREATE POLICY "Admins can update company settings"
ON public.company_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();