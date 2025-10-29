-- GAP #2: Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text UNIQUE NOT NULL,
  enabled boolean DEFAULT false,
  rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Public read access for feature flags
CREATE POLICY "Feature flags are viewable by everyone"
ON feature_flags
FOR SELECT
USING (true);

-- Admin can manage flags (using service role)
CREATE POLICY "Service role can manage feature flags"
ON feature_flags
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert PR#17 feature flag
INSERT INTO feature_flags (flag_key, enabled, rollout_percentage, metadata)
VALUES (
  'pr17_fast_path',
  true,
  100,
  '{"description": "PR#17 - Fast-Path para diagnósticos rápidos", "created_by": "system", "version": "1.0"}'::jsonb
)
ON CONFLICT (flag_key) DO NOTHING;

-- GAP #3: System Alerts Table
CREATE TABLE IF NOT EXISTS system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'high', 'critical')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Service role can manage alerts
CREATE POLICY "Service role can manage system alerts"
ON system_alerts
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Public read for monitoring dashboards
CREATE POLICY "System alerts are viewable by everyone"
ON system_alerts
FOR SELECT
USING (true);

-- GAP #3: Health Check Function
CREATE OR REPLACE FUNCTION check_fast_path_health()
RETURNS trigger AS $$
DECLARE
  recent_stats RECORD;
BEGIN
  -- Buscar estatísticas das últimas 2 horas
  SELECT 
    COUNT(*) FILTER (WHERE acao = 'fast_path_enabled') as activations,
    COUNT(*) FILTER (WHERE acao = 'fast_path_resolved') as resolutions,
    AVG((detalhes->>'elapsed_ms')::numeric) as avg_time
  INTO recent_stats
  FROM registros_de_monitoramento
  WHERE created_at >= NOW() - INTERVAL '2 hours'
    AND acao IN ('fast_path_enabled', 'fast_path_resolved', 'parallel_diag_finished');

  -- Alerta: Taxa de sucesso < 50%
  IF recent_stats.activations > 10 AND 
     (recent_stats.resolutions::float / NULLIF(recent_stats.activations, 0)) < 0.5 THEN
    INSERT INTO system_alerts (alert_type, severity, message, metadata)
    VALUES (
      'fast_path_low_success_rate',
      'high',
      'Fast-path success rate below 50%',
      jsonb_build_object(
        'rate', (recent_stats.resolutions::float / recent_stats.activations) * 100,
        'activations', recent_stats.activations,
        'resolutions', recent_stats.resolutions
      )
    );
  END IF;

  -- Alerta: Tempo médio > 6s
  IF recent_stats.avg_time > 6000 THEN
    INSERT INTO system_alerts (alert_type, severity, message, metadata)
    VALUES (
      'fast_path_high_latency',
      'warning',
      'Fast-path average time exceeds 6 seconds',
      jsonb_build_object(
        'avg_time_ms', recent_stats.avg_time
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for health monitoring
DROP TRIGGER IF EXISTS fast_path_health_check ON registros_de_monitoramento;
CREATE TRIGGER fast_path_health_check
AFTER INSERT ON registros_de_monitoramento
FOR EACH ROW
WHEN (NEW.acao IN ('fast_path_enabled', 'fast_path_resolved', 'fast_path_problem_confirmed'))
EXECUTE FUNCTION check_fast_path_health();