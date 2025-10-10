-- Limpar conversas duplicadas mantendo apenas a mais recente
DELETE FROM conversations a USING conversations b
WHERE a.id < b.id 
  AND a.channel = b.channel 
  AND a.customer_phone = b.customer_phone;

-- Agora adicionar a constraint
ALTER TABLE conversations 
ADD CONSTRAINT conversations_channel_customer_phone_key 
UNIQUE (channel, customer_phone);

-- Criar índice para performance (sem filtro de status)
CREATE INDEX IF NOT EXISTS idx_conversations_channel_phone 
ON conversations(channel, customer_phone);