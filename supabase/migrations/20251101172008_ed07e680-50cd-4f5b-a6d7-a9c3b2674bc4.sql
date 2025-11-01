-- Adicionar campos para notificações WhatsApp na tabela company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS whatsapp_notification_phones TEXT[], -- Array de números para notificar
ADD COLUMN IF NOT EXISTS whatsapp_instance_name TEXT DEFAULT 'SDR2'; -- Instância Evolution API

-- Comentários
COMMENT ON COLUMN public.company_settings.whatsapp_notification_phones IS 'Lista de números WhatsApp que receberão notificações de instalações (formato: 5561999999999)';
COMMENT ON COLUMN public.company_settings.whatsapp_instance_name IS 'Nome da instância Evolution API para envio de notificações';

-- Remover campos de webhook genérico (agora usaremos WhatsApp)
ALTER TABLE public.company_settings
DROP COLUMN IF EXISTS webhook_url,
DROP COLUMN IF EXISTS webhook_secret;