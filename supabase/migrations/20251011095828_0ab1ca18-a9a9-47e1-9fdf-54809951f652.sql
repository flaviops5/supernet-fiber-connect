-- Adicionar controle de feedback por agente
ALTER TABLE public.agent_presence 
ADD COLUMN IF NOT EXISTS feedback_enabled boolean DEFAULT true;

-- Criar tabela para armazenar feedbacks
CREATE TABLE IF NOT EXISTS public.conversation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  customer_rating integer NOT NULL CHECK (customer_rating >= 1 AND customer_rating <= 5),
  customer_comment text,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Habilitar RLS
ALTER TABLE public.conversation_feedback ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Agents can view feedback"
ON public.conversation_feedback
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'editor'::user_role)
);

CREATE POLICY "Agents can insert feedback"
ON public.conversation_feedback
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'editor'::user_role)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversation_feedback_conversation 
ON public.conversation_feedback(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_feedback_rating 
ON public.conversation_feedback(customer_rating);

-- Adicionar coluna para tracking de reabertura
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS reopened_from_conversation_id uuid REFERENCES public.conversations(id),
ADD COLUMN IF NOT EXISTS reopen_count integer DEFAULT 0;