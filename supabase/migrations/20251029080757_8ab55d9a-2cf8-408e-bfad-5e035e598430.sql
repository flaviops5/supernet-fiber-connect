-- PR #19 — Aging Inteligente

-- 1) Tabela de marcos temporais por conversa
CREATE TABLE IF NOT EXISTS support_aging_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  fluxo text NOT NULL DEFAULT 'support-tech',
  step text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Índices
CREATE INDEX IF NOT EXISTS idx_support_aging_events_conv ON support_aging_events (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_aging_events_step ON support_aging_events (step);
CREATE INDEX IF NOT EXISTS idx_support_aging_events_created ON support_aging_events (created_at DESC);

-- 3) View de aging agregado (últimos 14 dias)
CREATE OR REPLACE VIEW dashboard_support_aging_summary AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) FILTER (WHERE step = 'resolved') AS resolved_events,
  COUNT(*) FILTER (WHERE step = 'ticket_opened') AS ticket_events
FROM support_aging_events
WHERE created_at >= now() - interval '14 days'
GROUP BY 1
ORDER BY 1 ASC;

-- 4) RPC: p50/p90 do tempo total (start -> resolved) por conversa
CREATE OR REPLACE FUNCTION calc_support_aging_p50_p90_14d()
RETURNS TABLE (
  conversations bigint,
  p50_seconds numeric,
  p90_seconds numeric
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  WITH recent_events AS (
    SELECT conversation_id, step, created_at
    FROM support_aging_events
    WHERE created_at >= now() - interval '14 days'
    LIMIT 50000
  ),
  spans AS (
    SELECT
      conversation_id,
      MIN(CASE WHEN step = 'start' THEN created_at END) AS t_start,
      MAX(CASE WHEN step = 'resolved' THEN created_at END) AS t_resolved
    FROM recent_events
    GROUP BY conversation_id
  ),
  durations AS (
    SELECT
      conversation_id,
      EXTRACT(EPOCH FROM (t_resolved - t_start)) AS dur_s
    FROM spans
    WHERE t_start IS NOT NULL 
      AND t_resolved IS NOT NULL 
      AND t_resolved > t_start
      AND EXTRACT(EPOCH FROM (t_resolved - t_start)) > 0
      AND EXTRACT(EPOCH FROM (t_resolved - t_start)) < 86400
  )
  SELECT
    COUNT(*)::bigint AS conversations,
    COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dur_s), 0) AS p50_seconds,
    COALESCE(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY dur_s), 0) AS p90_seconds
  FROM durations;
$$;

GRANT EXECUTE ON FUNCTION calc_support_aging_p50_p90_14d() TO authenticated;

-- 5) RLS Policies
ALTER TABLE support_aging_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert aging events"
ON support_aging_events
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Admins and editors can view aging events"
ON support_aging_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'editor')
  )
);

-- PR #19 — Rastreamento de ONU

CREATE TABLE IF NOT EXISTS onu_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  ixc_client_id text,
  onu_serial text,
  rx_dbm numeric,
  tx_dbm numeric,
  status text CHECK (status IN ('ok', 'weak', 'critical', 'unknown')),
  source text CHECK (source IN ('signal_tool', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onu_track_client ON onu_tracking_events (ixc_client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onu_track_serial ON onu_tracking_events (onu_serial);
CREATE INDEX IF NOT EXISTS idx_onu_track_created ON onu_tracking_events (created_at DESC);

CREATE OR REPLACE VIEW dashboard_onu_latest_and_changes AS
WITH last_seen AS (
  SELECT DISTINCT ON (ixc_client_id)
    ixc_client_id, onu_serial, rx_dbm, tx_dbm, created_at
  FROM onu_tracking_events
  WHERE ixc_client_id IS NOT NULL
  ORDER BY ixc_client_id, created_at DESC
),
changes_30d AS (
  SELECT ixc_client_id, COUNT(DISTINCT onu_serial) AS distinct_onu_30d
  FROM onu_tracking_events
  WHERE created_at >= now() - interval '30 days'
    AND ixc_client_id IS NOT NULL
  GROUP BY ixc_client_id
)
SELECT
  l.ixc_client_id,
  l.onu_serial,
  l.rx_dbm,
  l.tx_dbm,
  l.created_at AS last_seen_at,
  COALESCE(c.distinct_onu_30d, 0) AS serials_30d
FROM last_seen l
LEFT JOIN changes_30d c USING (ixc_client_id)
ORDER BY l.created_at DESC
LIMIT 1000;

CREATE OR REPLACE FUNCTION calc_onu_instability_top_14d(limit_n int DEFAULT 20)
RETURNS TABLE (
  ixc_client_id text,
  events_weak_critical bigint,
  last_serial text
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  WITH recent_events AS (
    SELECT ixc_client_id, status, onu_serial, created_at
    FROM onu_tracking_events
    WHERE created_at >= now() - interval '14 days'
      AND ixc_client_id IS NOT NULL
    LIMIT 50000
  ),
  instab AS (
    SELECT 
      ixc_client_id,
      COUNT(*) FILTER (WHERE status IN ('weak','critical')) AS wc
    FROM recent_events
    GROUP BY ixc_client_id
  ),
  last_serial AS (
    SELECT DISTINCT ON (ixc_client_id) 
      ixc_client_id, onu_serial
    FROM recent_events
    ORDER BY ixc_client_id, created_at DESC
  )
  SELECT 
    i.ixc_client_id, 
    i.wc AS events_weak_critical, 
    ls.onu_serial AS last_serial
  FROM instab i
  LEFT JOIN last_serial ls USING (ixc_client_id)
  WHERE i.wc > 0
  ORDER BY i.wc DESC, i.ixc_client_id
  LIMIT LEAST(limit_n, 100);
$$;

GRANT EXECUTE ON FUNCTION calc_onu_instability_top_14d(limit_n int) TO authenticated;

ALTER TABLE onu_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert onu tracking"
ON onu_tracking_events
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Admins and editors can view onu tracking"
ON onu_tracking_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'editor')
  )
);

-- PR #19 — Painel de Retests

CREATE TABLE IF NOT EXISTS support_retests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  ixc_client_id text,
  step text CHECK (step IN ('post_reboot', 'post_optical', 'post_route')),
  before_ok boolean,
  after_ok boolean,
  latency_ms_before int,
  latency_ms_after int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retests_client ON support_retests (ixc_client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retests_step ON support_retests (step);
CREATE INDEX IF NOT EXISTS idx_retests_created ON support_retests (created_at DESC);

CREATE OR REPLACE VIEW dashboard_retests_7d AS
SELECT
  step,
  COUNT(*) AS total,
  SUM(CASE WHEN after_ok = true THEN 1 ELSE 0 END) AS ok_after,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 
      THEN (SUM(CASE WHEN after_ok = true THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100 
      ELSE 0 
    END, 
    1
  ) AS success_rate_pct
FROM support_retests
WHERE created_at >= now() - interval '7 days'
GROUP BY step
ORDER BY success_rate_pct DESC;

ALTER TABLE support_retests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert retests"
ON support_retests
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Admins and editors can view retests"
ON support_retests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'editor')
  )
);

-- PR #19 — Cleanup Job

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'pr19-cleanup-aging-90d',
  '0 3 * * *',
  $$
  DELETE FROM support_aging_events 
  WHERE created_at < now() - interval '90 days';
  $$
);

SELECT cron.schedule(
  'pr19-cleanup-onu-90d',
  '5 3 * * *',
  $$
  DELETE FROM onu_tracking_events 
  WHERE created_at < now() - interval '90 days';
  $$
);

SELECT cron.schedule(
  'pr19-cleanup-retests-90d',
  '10 3 * * *',
  $$
  DELETE FROM support_retests 
  WHERE created_at < now() - interval '90 days';
  $$
);