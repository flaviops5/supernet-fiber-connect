-- Adicionar campos de webhook na tabela company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Comentários
COMMENT ON COLUMN public.company_settings.webhook_url IS 'URL do webhook para notificações de instalação';
COMMENT ON COLUMN public.company_settings.webhook_secret IS 'Secret opcional para autenticação do webhook';