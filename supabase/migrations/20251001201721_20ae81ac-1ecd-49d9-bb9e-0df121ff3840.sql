-- Adicionar campos para mensagens de notificação
ALTER TABLE payment_notifications
ADD COLUMN IF NOT EXISTS whatsapp_message TEXT,
ADD COLUMN IF NOT EXISTS email_message TEXT,
ADD COLUMN IF NOT EXISTS email_subject TEXT;