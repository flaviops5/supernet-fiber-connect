-- =========================================
-- PR #19 - Métricas Avançadas de Suporte (COMPLETO)
-- =========================================

-- 1) Aging p50/p90 (14 dias) - já existe, apenas garantindo
CREATE OR REPLACE FUNCTION calc_support_aging_p50_p90_14d()
RETURNS TABLE (
  conversations BIGINT,
  p50_seconds NUMERIC,
  p90_seconds NUMERIC
)
LANGUAGE SQL
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
      MIN(CASE WHEN step = 'start' THEN created_at END) AS started_at,
      MAX(CASE WHEN step = 'resolved' THEN created_at END) AS resolved_at
    FROM recent_events
    GROUP BY conversation_id
    HAVING MIN(CASE WHEN step = 'start' THEN created_at END) IS NOT NULL
       AND MAX(CASE WHEN step = 'resolved' THEN created_at END) IS NOT NULL
  ),
  durations AS (
    SELECT EXTRACT(EPOCH FROM (resolved_at - started_at)) AS seconds
    FROM spans
    WHERE resolved_at > started_at
  )
  SELECT
    COUNT(*)::BIGINT AS conversations,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY seconds) AS p50_seconds,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY seconds) AS p90_seconds
  FROM durations;
$$;

-- 2) ONU Instability Top 20 (14 dias)
CREATE OR REPLACE FUNCTION calc_onu_instability_top_14d()
RETURNS TABLE (
  ixc_client_id TEXT,
  last_serial TEXT,
  events_weak_critical BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: Only admin and gestor roles can execute
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  ) THEN
    RAISE EXCEPTION 'Access denied: requires admin or gestor role';
  END IF;

  RETURN QUERY
  SELECT
    (detalhes->>'ixc_client_id')::TEXT AS ixc_client_id,
    (detalhes->>'ont_serial')::TEXT AS last_serial,
    COUNT(*)::BIGINT AS events_weak_critical
  FROM registros_de_monitoramento
  WHERE fluxo = 'support-tech'
    AND acao IN ('scenario_b_detected', 'scenario_d_detected')
    AND created_at >= now() - interval '14 days'
    AND (detalhes->>'ixc_client_id') IS NOT NULL
  GROUP BY 1, 2
  ORDER BY events_weak_critical DESC
  LIMIT 20;
END;
$$;

-- 3) Retest Effectiveness (7 dias)
CREATE OR REPLACE FUNCTION calc_retest_effectiveness_7d()
RETURNS TABLE (
  step TEXT,
  total BIGINT,
  ok_after BIGINT,
  success_rate_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: Only admin and gestor roles can execute
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  ) THEN
    RAISE EXCEPTION 'Access denied: requires admin or gestor role';
  END IF;

  RETURN QUERY
  WITH retest_events AS (
    SELECT
      conversation_id,
      acao,
      (detalhes->>'step')::TEXT AS step,
      (detalhes->>'result')::TEXT AS result,
      created_at
    FROM registros_de_monitoramento
    WHERE fluxo = 'support-tech'
      AND acao ILIKE '%retest%'
      AND created_at >= now() - interval '7 days'
  )
  SELECT
    COALESCE(step, 'geral') AS step,
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE result = 'ok')::BIGINT AS ok_after,
    ROUND(
      (COUNT(*) FILTER (WHERE result = 'ok')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      1
    ) AS success_rate_pct
  FROM retest_events
  GROUP BY step
  ORDER BY total DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION calc_support_aging_p50_p90_14d() TO authenticated;
GRANT EXECUTE ON FUNCTION calc_onu_instability_top_14d() TO authenticated;
GRANT EXECUTE ON FUNCTION calc_retest_effectiveness_7d() TO authenticated;