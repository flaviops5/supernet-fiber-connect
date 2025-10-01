-- Criar tabela de notificações de pagamento
CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ixc_title_id TEXT NOT NULL,
  ixc_client_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  days_before_due INTEGER NOT NULL CHECK (days_before_due IN (10, 1)),
  notification_type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (notification_type IN ('whatsapp', 'sms', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ixc_title_id, days_before_due)
);

-- Índices para performance
CREATE INDEX idx_payment_notifications_status ON public.payment_notifications(status);
CREATE INDEX idx_payment_notifications_due_date ON public.payment_notifications(due_date);
CREATE INDEX idx_payment_notifications_ixc_client ON public.payment_notifications(ixc_client_id);
CREATE INDEX idx_payment_notifications_created_at ON public.payment_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all notifications"
  ON public.payment_notifications
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can view notifications"
  ON public.payment_notifications
  FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_payment_notifications_updated_at
  BEFORE UPDATE ON public.payment_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.payment_notifications IS 'Armazena notificações de vencimento de faturas enviadas aos clientes';
COMMENT ON COLUMN public.payment_notifications.days_before_due IS 'Dias antes do vencimento (10 ou 1)';
COMMENT ON COLUMN public.payment_notifications.status IS 'Status da notificação: pending, sent, failed, cancelled';