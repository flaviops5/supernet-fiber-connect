-- Adicionar campos de configuração de autenticação na tabela company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS auth_title TEXT DEFAULT 'ÁREA ADMIN',
ADD COLUMN IF NOT EXISTS auth_subtitle TEXT DEFAULT 'Informe seus dados de acesso.',
ADD COLUMN IF NOT EXISTS auth_background_color TEXT DEFAULT '#ef4444',
ADD COLUMN IF NOT EXISTS auth_gradient_from TEXT DEFAULT '#ef4444',
ADD COLUMN IF NOT EXISTS auth_gradient_to TEXT DEFAULT '#fb7185',
ADD COLUMN IF NOT EXISTS signup_enabled BOOLEAN DEFAULT true;

-- Atualizar configurações existentes com valores padrão
UPDATE public.company_settings
SET 
  auth_title = COALESCE(auth_title, 'ÁREA ADMIN'),
  auth_subtitle = COALESCE(auth_subtitle, 'Informe seus dados de acesso.'),
  auth_background_color = COALESCE(auth_background_color, '#ef4444'),
  auth_gradient_from = COALESCE(auth_gradient_from, '#ef4444'),
  auth_gradient_to = COALESCE(auth_gradient_to, '#fb7185'),
  signup_enabled = COALESCE(signup_enabled, true);