-- Criar tabela para histórico de contatos dos clientes
CREATE TABLE public.customer_contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  contact_reason TEXT,
  was_found_in_ixc BOOLEAN DEFAULT false,
  ixc_client_id TEXT,
  conversation_id UUID,
  contact_channel TEXT DEFAULT 'whatsapp',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_customer_contact_cpf ON public.customer_contact_history(cpf);
CREATE INDEX idx_customer_contact_created ON public.customer_contact_history(created_at DESC);
CREATE INDEX idx_customer_contact_conversation ON public.customer_contact_history(conversation_id);

-- Trigger para updated_at
CREATE TRIGGER update_customer_contact_history_updated_at
  BEFORE UPDATE ON public.customer_contact_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.customer_contact_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view contact history"
  ON public.customer_contact_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view contact history"
  ON public.customer_contact_history
  FOR SELECT
  USING (has_role(auth.uid(), 'editor'));

CREATE POLICY "Agents can insert contact history"
  ON public.customer_contact_history
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage contact history"
  ON public.customer_contact_history
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));