-- ============================================
-- TABELAS DE MÉTRICAS E OBSERVABILIDADE
-- ============================================

-- 1. Métricas de Performance
CREATE TABLE IF NOT EXISTS public.agent_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  conversation_id uuid,
  action_type text NOT NULL,
  success boolean NOT NULL,
  duration_ms integer NOT NULL,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_metrics_created_at ON public.agent_metrics(created_at DESC);
CREATE INDEX idx_agent_metrics_agent_name ON public.agent_metrics(agent_name);
CREATE INDEX idx_agent_metrics_success ON public.agent_metrics(success);

-- 2. Dead Letter Queue
CREATE TABLE IF NOT EXISTS public.failed_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_log_id uuid REFERENCES public.action_log(id),
  agent_name text NOT NULL,
  client_cpf text,
  action_type text NOT NULL,
  action_payload jsonb NOT NULL,
  error_message text NOT NULL,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  last_retry_at timestamptz,
  resolved_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_failed_actions_status ON public.failed_actions(status);
CREATE INDEX idx_failed_actions_created_at ON public.failed_actions(created_at DESC);

-- 3. Rate Limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_cpf ON public.rate_limit_tracking(cpf);
CREATE INDEX idx_rate_limit_window ON public.rate_limit_tracking(window_start);

-- 4. System Health
CREATE TABLE IF NOT EXISTS public.system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL,
  status text NOT NULL,
  last_check timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_health_component ON public.system_health(component);
CREATE INDEX idx_system_health_last_check ON public.system_health(last_check DESC);

-- 5. Alert Config
CREATE TABLE IF NOT EXISTS public.alert_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  threshold_value numeric NOT NULL,
  window_minutes integer NOT NULL DEFAULT 5,
  notification_channels jsonb NOT NULL DEFAULT '["email"]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Alert History
CREATE TABLE IF NOT EXISTS public.alert_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id uuid REFERENCES public.alert_config(id),
  alert_type text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  notified_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_history_created_at ON public.alert_history(created_at DESC);
CREATE INDEX idx_alert_history_severity ON public.alert_history(severity);

-- Enable RLS
ALTER TABLE public.agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view agent_metrics"
  ON public.agent_metrics FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view failed_actions"
  ON public.failed_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage failed_actions"
  ON public.failed_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view system_health"
  ON public.system_health FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view alert_config"
  ON public.alert_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage alert_config"
  ON public.alert_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view alert_history"
  ON public.alert_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Configurações padrão
INSERT INTO public.alert_config (alert_type, threshold_value, window_minutes, notification_channels)
VALUES 
  ('error_rate', 5.0, 5, '["email"]'),
  ('response_time', 5000, 5, '["email"]'),
  ('circuit_breaker_open', 1, 1, '["email"]'),
  ('ixc_down', 1, 1, '["email"]')
ON CONFLICT DO NOTHING;