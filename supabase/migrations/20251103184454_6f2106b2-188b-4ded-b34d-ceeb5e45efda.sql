-- Correção de segurança: Recriar views sem SECURITY DEFINER
-- Views serão recriadas com o comportamento padrão (SECURITY INVOKER)

-- 1. context_escape_analysis
CREATE OR REPLACE VIEW public.context_escape_analysis AS
SELECT date_trunc('day'::text, created_at) AS transfer_date,
    count(*) AS total_transfers,
    count(*) FILTER (WHERE ((metadata -> 'flow_state'::text) ->> 'transfer_reason'::text) = 'context_escape'::text) AS escape_transfers,
    count(*) FILTER (WHERE ((metadata -> 'flow_state'::text) ->> 'transfer_reason'::text) <> 'context_escape'::text OR ((metadata -> 'flow_state'::text) ->> 'transfer_reason'::text) IS NULL) AS other_transfers,
    round(count(*) FILTER (WHERE ((metadata -> 'flow_state'::text) ->> 'transfer_reason'::text) = 'context_escape'::text)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS escape_rate_percent,
    round(avg(EXTRACT(epoch FROM updated_at - created_at) / 60::numeric) FILTER (WHERE ((metadata -> 'flow_state'::text) ->> 'transfer_reason'::text) = 'context_escape'::text), 2) AS avg_time_to_escape_minutes
FROM conversations c
WHERE (((metadata -> 'flow_state'::text) ->> 'transferred_to_human'::text)::boolean) = true AND created_at >= (now() - '30 days'::interval)
GROUP BY (date_trunc('day'::text, created_at))
ORDER BY (date_trunc('day'::text, created_at)) DESC;

-- 2. dashboard_hibrido_vs_deterministico
CREATE OR REPLACE VIEW public.dashboard_hibrido_vs_deterministico AS
SELECT COALESCE(detalhes ->> 'hybrid_mode'::text, 'OFF'::text) AS modo,
    count(*) AS total_atendimentos,
    count(*) FILTER (WHERE ((detalhes ->> 'resolved'::text)::boolean) IS TRUE) AS resolvidos,
    count(*) FILTER (WHERE ((detalhes ->> 'escalated'::text)::boolean) IS TRUE) AS escalados,
    round(count(*) FILTER (WHERE ((detalhes ->> 'resolved'::text)::boolean) IS TRUE)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS taxa_resolucao_percent,
    round(count(*) FILTER (WHERE ((detalhes ->> 'escalated'::text)::boolean) IS TRUE)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS taxa_escalacao_percent
FROM registros_de_monitoramento
WHERE fluxo = 'support-tech'::text AND acao = 'kpi_update'::text
GROUP BY (COALESCE(detalhes ->> 'hybrid_mode'::text, 'OFF'::text))
ORDER BY (COALESCE(detalhes ->> 'hybrid_mode'::text, 'OFF'::text));

-- 3. dashboard_onu_latest_and_changes
CREATE OR REPLACE VIEW public.dashboard_onu_latest_and_changes AS
WITH last_seen AS (
  SELECT DISTINCT ON (onu_tracking_events.ixc_client_id) 
    onu_tracking_events.ixc_client_id,
    onu_tracking_events.onu_serial,
    onu_tracking_events.rx_dbm,
    onu_tracking_events.tx_dbm,
    onu_tracking_events.created_at
  FROM onu_tracking_events
  WHERE onu_tracking_events.ixc_client_id IS NOT NULL
  ORDER BY onu_tracking_events.ixc_client_id, onu_tracking_events.created_at DESC
), changes_30d AS (
  SELECT onu_tracking_events.ixc_client_id,
    count(DISTINCT onu_tracking_events.onu_serial) AS distinct_onu_30d
  FROM onu_tracking_events
  WHERE onu_tracking_events.created_at >= (now() - '30 days'::interval) AND onu_tracking_events.ixc_client_id IS NOT NULL
  GROUP BY onu_tracking_events.ixc_client_id
)
SELECT l.ixc_client_id,
  l.onu_serial,
  l.rx_dbm,
  l.tx_dbm,
  l.created_at AS last_seen_at,
  COALESCE(c.distinct_onu_30d, 0::bigint) AS serials_30d
FROM last_seen l
LEFT JOIN changes_30d c USING (ixc_client_id)
ORDER BY l.created_at DESC
LIMIT 1000;

-- 4. dashboard_retests_7d
CREATE OR REPLACE VIEW public.dashboard_retests_7d AS
SELECT step,
  count(*) AS total,
  sum(CASE WHEN after_ok = true THEN 1 ELSE 0 END) AS ok_after,
  round(CASE WHEN count(*) > 0 THEN sum(CASE WHEN after_ok = true THEN 1 ELSE 0 END)::numeric / count(*)::numeric * 100::numeric ELSE 0::numeric END, 1) AS success_rate_pct
FROM support_retests
WHERE created_at >= (now() - '7 days'::interval)
GROUP BY step
ORDER BY success_rate_pct DESC;

-- Continua na próxima parte devido ao limite de caracteres...
