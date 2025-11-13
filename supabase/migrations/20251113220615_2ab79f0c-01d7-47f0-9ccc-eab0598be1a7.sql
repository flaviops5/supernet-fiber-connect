-- ============================================
-- WEBHOOK IDEMPOTENCY - Item 11 Auditoria
-- ============================================
-- Tabela para rastrear eventos de webhook e prevenir duplicação
-- Garante que mensagens não sejam processadas múltiplas vezes

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_name TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Índice único para garantir que o mesmo evento não seja processado duas vezes
  CONSTRAINT webhook_events_unique_event UNIQUE (webhook_name, event_id)
);

-- Índice para busca rápida por webhook_name
CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_name 
ON public.webhook_events(webhook_name);

-- Índice para busca por data (útil para limpeza)
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
ON public.webhook_events(created_at DESC);

-- Índice para busca por event_type
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type 
ON public.webhook_events(event_type);

-- Comentários
COMMENT ON TABLE public.webhook_events IS 'Rastreia eventos de webhook para garantir idempotência e prevenir processamento duplicado';
COMMENT ON COLUMN public.webhook_events.webhook_name IS 'Nome do webhook que recebeu o evento (ex: whatsapp-webhook, nps-webhook)';
COMMENT ON COLUMN public.webhook_events.event_id IS 'Identificador único do evento (ex: messageId, responseId)';
COMMENT ON COLUMN public.webhook_events.event_type IS 'Tipo de evento (ex: message, status_update, nps_response)';
COMMENT ON COLUMN public.webhook_events.payload IS 'Payload completo do webhook para auditoria';
COMMENT ON COLUMN public.webhook_events.metadata IS 'Dados adicionais como trace_id, duration_ms, etc';

-- RLS: Apenas service_role pode acessar (webhooks rodam com service_role)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook events"
  ON public.webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Função para limpar eventos antigos (mais de 30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.webhook_events
  WHERE created_at < (NOW() - INTERVAL '30 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_webhook_events IS 'Remove eventos de webhook com mais de 30 dias para economia de storage';