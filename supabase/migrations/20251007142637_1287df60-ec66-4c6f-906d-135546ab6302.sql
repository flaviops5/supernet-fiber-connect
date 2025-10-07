-- Tabela para registrar reinicializações de equipamentos
CREATE TABLE IF NOT EXISTS public.equipment_reboots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ixc_client_id TEXT NOT NULL,
  client_login TEXT,
  client_name TEXT,
  client_ip TEXT,
  detection_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  reboot_timestamp TIMESTAMP WITH TIME ZONE,
  reboot_completed_at TIMESTAMP WITH TIME ZONE,
  bandwidth_before_kbps NUMERIC,
  bandwidth_after_kbps NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, rebooting, success, failed, skipped
  skip_reason TEXT,
  error_message TEXT,
  verification_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_equipment_reboots_client ON public.equipment_reboots(ixc_client_id);
CREATE INDEX idx_equipment_reboots_status ON public.equipment_reboots(status);
CREATE INDEX idx_equipment_reboots_detection ON public.equipment_reboots(detection_timestamp DESC);

-- Trigger para updated_at
CREATE TRIGGER update_equipment_reboots_updated_at
  BEFORE UPDATE ON public.equipment_reboots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.equipment_reboots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem visualizar reboots"
  ON public.equipment_reboots
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins podem gerenciar reboots"
  ON public.equipment_reboots
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Tabela para blacklist de equipamentos
CREATE TABLE IF NOT EXISTS public.equipment_reboot_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ixc_client_id TEXT NOT NULL UNIQUE,
  client_name TEXT,
  reason TEXT,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_reboot_blacklist_client ON public.equipment_reboot_blacklist(ixc_client_id);

ALTER TABLE public.equipment_reboot_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar blacklist"
  ON public.equipment_reboot_blacklist
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));