-- Tabela para registrar eventos de queda em massa
CREATE TABLE IF NOT EXISTS public.mass_outage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE, -- Chave única baseada em região+data
  region_pattern TEXT NOT NULL, -- Ex: "SRI-B" (local-bloco)
  affected_count INTEGER NOT NULL, -- Quantidade de clientes afetados
  affected_logins TEXT[] NOT NULL, -- Lista de logins afetados
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active', -- active, resolved, notified
  metadata JSONB DEFAULT '{}'::jsonb,
  notifications_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mass_outage_status ON public.mass_outage_events(status);
CREATE INDEX IF NOT EXISTS idx_mass_outage_region ON public.mass_outage_events(region_pattern);
CREATE INDEX IF NOT EXISTS idx_mass_outage_detected ON public.mass_outage_events(detected_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_mass_outage_events_updated_at
  BEFORE UPDATE ON public.mass_outage_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.mass_outage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage mass outage events"
  ON public.mass_outage_events
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can view mass outage events"
  ON public.mass_outage_events
  FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Tabela para rastrear notificações enviadas
CREATE TABLE IF NOT EXISTS public.outage_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outage_event_id UUID NOT NULL REFERENCES public.mass_outage_events(id) ON DELETE CASCADE,
  customer_login TEXT NOT NULL,
  customer_phone TEXT,
  customer_name TEXT,
  channel TEXT NOT NULL, -- whatsapp, email, sms
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent', -- sent, failed, delivered
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_outage_notifications_event ON public.outage_notifications(outage_event_id);
CREATE INDEX IF NOT EXISTS idx_outage_notifications_login ON public.outage_notifications(customer_login);

-- RLS policies
ALTER TABLE public.outage_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outage notifications"
  ON public.outage_notifications
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can view outage notifications"
  ON public.outage_notifications
  FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));