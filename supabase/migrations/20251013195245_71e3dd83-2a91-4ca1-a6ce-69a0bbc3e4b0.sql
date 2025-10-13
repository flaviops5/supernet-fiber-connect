-- ============================================
-- Sprint 0 + Sprint 1: Infraestrutura e Segurança
-- ============================================

-- 1. Tabela para controle de idempotência (HMAC + TTL)
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  request_signature TEXT,
  request_timestamp BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índice para limpeza automática
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_expires_at 
ON public.processed_webhooks(expires_at);

-- Índice para busca rápida por webhook_id
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_webhook_id 
ON public.processed_webhooks(webhook_id);

-- 2. Tabela de auditoria LGPD
CREATE TABLE IF NOT EXISTS public.lgpd_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action_type TEXT NOT NULL, -- 'access', 'export', 'delete', 'anonymize'
  resource_type TEXT NOT NULL, -- 'conversation', 'customer_data', 'pii'
  resource_id TEXT,
  legal_basis TEXT, -- 'consent', 'legitimate_interest', 'legal_obligation'
  purpose TEXT NOT NULL,
  data_accessed JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  retention_until TIMESTAMP WITH TIME ZONE
);

-- Índices para performance e compliance
CREATE INDEX IF NOT EXISTS idx_lgpd_audit_user_id ON public.lgpd_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_audit_resource ON public.lgpd_audit(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_audit_created_at ON public.lgpd_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_lgpd_audit_retention ON public.lgpd_audit(retention_until);

-- 3. Tabela de dataset para fine-tuning supervisionado
CREATE TABLE IF NOT EXISTS public.training_dataset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id),
  input_context TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  actual_output TEXT,
  agent_type TEXT NOT NULL, -- 'routing', 'sales', 'support_tech', etc.
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para treinamento
CREATE INDEX IF NOT EXISTS idx_training_dataset_agent_type ON public.training_dataset(agent_type);
CREATE INDEX IF NOT EXISTS idx_training_dataset_validated ON public.training_dataset(is_validated);
CREATE INDEX IF NOT EXISTS idx_training_dataset_quality ON public.training_dataset(quality_score);

-- 4. Tabela de feedback de roteamento (para aprendizado supervisionado)
CREATE TABLE IF NOT EXISTS public.routing_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id),
  ai_suggested_department TEXT,
  ai_confidence NUMERIC(3,2),
  actual_department TEXT,
  agent_override UUID, -- ID do agente que corrigiu
  override_reason TEXT,
  was_correct BOOLEAN,
  correction_timestamp TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para análise de performance
CREATE INDEX IF NOT EXISTS idx_routing_feedback_correct ON public.routing_feedback(was_correct);
CREATE INDEX IF NOT EXISTS idx_routing_feedback_department ON public.routing_feedback(ai_suggested_department);
CREATE INDEX IF NOT EXISTS idx_routing_feedback_conversation ON public.routing_feedback(conversation_id);

-- 5. Adicionar campo de consentimento LGPD em conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS lgpd_consent BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS lgpd_consent_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS opt_out_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS opt_out_date TIMESTAMP WITH TIME ZONE;

-- 6. Função para limpeza automática de webhooks expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_webhooks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.processed_webhooks
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 7. Função para anonimização automática (LGPD - 90 dias)
CREATE OR REPLACE FUNCTION public.anonymize_old_conversations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Anonimizar conversas com mais de 90 dias
  UPDATE public.conversations
  SET 
    customer_name = '[ANONIMIZADO]',
    customer_email = NULL,
    customer_phone = '[ANONIMIZADO]',
    customer_cpf = NULL,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{anonymized}',
      'true'::jsonb
    ),
    metadata = jsonb_set(
      metadata,
      '{anonymized_at}',
      to_jsonb(NOW())
    )
  WHERE 
    created_at < (NOW() - interval '90 days')
    AND customer_name != '[ANONIMIZADO]'
    AND (opt_out_requested = true OR lgpd_consent = false);
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Registrar na auditoria
  INSERT INTO public.lgpd_audit (
    action_type,
    resource_type,
    legal_basis,
    purpose,
    data_accessed
  ) VALUES (
    'anonymize',
    'conversation',
    'legal_obligation',
    'Anonimização automática após 90 dias (LGPD Art. 16)',
    jsonb_build_object('affected_count', affected_count)
  );
  
  RETURN affected_count;
END;
$$;

-- 8. RLS Policies

-- processed_webhooks: apenas sistema pode acessar
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sistema pode gerenciar webhooks processados"
ON public.processed_webhooks
FOR ALL
TO service_role
USING (true);

-- lgpd_audit: apenas admins podem visualizar
ALTER TABLE public.lgpd_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem visualizar auditoria LGPD"
ON public.lgpd_audit
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Sistema pode inserir em auditoria LGPD"
ON public.lgpd_audit
FOR INSERT
TO service_role
WITH CHECK (true);

-- training_dataset: admins e editores
ALTER TABLE public.training_dataset ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar dataset de treinamento"
ON public.training_dataset
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editores podem visualizar dataset validado"
ON public.training_dataset
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'editor'::user_role) 
  AND is_validated = true
);

-- routing_feedback: agentes podem inserir, admins gerenciar
ALTER TABLE public.routing_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agentes podem inserir feedback de roteamento"
ON public.routing_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'editor'::user_role) 
  OR has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Admins podem gerenciar feedback de roteamento"
ON public.routing_feedback
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- 9. Triggers

-- Trigger para atualizar updated_at em training_dataset
CREATE TRIGGER update_training_dataset_updated_at
BEFORE UPDATE ON public.training_dataset
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE public.processed_webhooks IS 'Controle de idempotência com TTL de 24h para webhooks (Sprint 1)';
COMMENT ON TABLE public.lgpd_audit IS 'Auditoria completa de acesso a dados pessoais conforme LGPD (Sprint 1)';
COMMENT ON TABLE public.training_dataset IS 'Dataset supervisionado para fine-tuning dos agentes IA (Sprint 0/3)';
COMMENT ON TABLE public.routing_feedback IS 'Feedback de roteamento para aprendizado supervisionado (Sprint 3)';
COMMENT ON FUNCTION public.cleanup_expired_webhooks IS 'Limpa webhooks processados após 24h';
COMMENT ON FUNCTION public.anonymize_old_conversations IS 'Anonimiza conversas antigas conforme LGPD';
