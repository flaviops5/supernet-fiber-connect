-- Tabela para configurações do auto-reboot
CREATE TABLE IF NOT EXISTS public.auto_reboot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  cron_interval_minutes INTEGER NOT NULL DEFAULT 30,
  bandwidth_threshold_kbps INTEGER NOT NULL DEFAULT 900,
  verification_count INTEGER NOT NULL DEFAULT 3,
  verification_interval_seconds INTEGER NOT NULL DEFAULT 60,
  cooldown_hours INTEGER NOT NULL DEFAULT 24,
  exclude_hours_start INTEGER NOT NULL DEFAULT 1,
  exclude_hours_end INTEGER NOT NULL DEFAULT 6,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Inserir configuração padrão
INSERT INTO public.auto_reboot_settings (
  enabled,
  cron_interval_minutes,
  bandwidth_threshold_kbps,
  verification_count,
  verification_interval_seconds,
  cooldown_hours,
  exclude_hours_start,
  exclude_hours_end
) VALUES (
  true,
  30,
  900,
  3,
  60,
  24,
  1,
  6
)
ON CONFLICT DO NOTHING;

-- Trigger para updated_at
CREATE TRIGGER update_auto_reboot_settings_updated_at
  BEFORE UPDATE ON public.auto_reboot_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.auto_reboot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar configurações de auto-reboot"
  ON public.auto_reboot_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins podem visualizar configurações de auto-reboot"
  ON public.auto_reboot_settings
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));