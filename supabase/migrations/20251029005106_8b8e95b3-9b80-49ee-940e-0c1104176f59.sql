-- PR #13: View para análise de context_escape (FINAL ✅)
-- Enum conversation_status: 'waiting', 'active', 'paused', 'resolved', 'transferred'

CREATE OR REPLACE VIEW public.context_escape_analysis AS
SELECT 
  date_trunc('day', c.created_at) as transfer_date,
  
  COUNT(*) as total_transfers,
  COUNT(*) FILTER (WHERE (c.metadata->'flow_state'->>'transfer_reason') = 'context_escape') as escape_transfers,
  COUNT(*) FILTER (WHERE (c.metadata->'flow_state'->>'transfer_reason') != 'context_escape' 
                   OR (c.metadata->'flow_state'->>'transfer_reason') IS NULL) as other_transfers,
  
  ROUND(
    (COUNT(*) FILTER (WHERE (c.metadata->'flow_state'->>'transfer_reason') = 'context_escape'))::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as escape_rate_percent,
  
  ROUND(
    (AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at)) / 60) 
     FILTER (WHERE (c.metadata->'flow_state'->>'transfer_reason') = 'context_escape'))::numeric,
    2
  ) as avg_time_to_escape_minutes

FROM public.conversations c
WHERE (c.metadata->'flow_state'->>'transferred_to_human')::boolean = true
  AND c.created_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', c.created_at)
ORDER BY transfer_date DESC;

CREATE OR REPLACE VIEW public.top_escape_steps AS
SELECT 
  COALESCE((c.metadata->'flow_state'->>'waiting_step'), 'unknown') as step_name,
  COALESCE((c.metadata->'flow_state'->>'scenario_started'), 'unknown') as scenario,
  COUNT(*) as escape_count,
  ROUND(AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at)) / 60)::numeric, 2) as avg_duration_minutes,
  MAX(c.updated_at) as last_occurrence
FROM public.conversations c
WHERE (c.metadata->'flow_state'->>'transfer_reason') = 'context_escape'
  AND c.created_at >= NOW() - INTERVAL '30 days'
GROUP BY 
  COALESCE((c.metadata->'flow_state'->>'waiting_step'), 'unknown'),
  COALESCE((c.metadata->'flow_state'->>'scenario_started'), 'unknown')
ORDER BY escape_count DESC
LIMIT 10;

GRANT SELECT ON public.context_escape_analysis TO authenticated;
GRANT SELECT ON public.top_escape_steps TO authenticated;

COMMENT ON VIEW public.context_escape_analysis IS 
'PR #13: Análise temporal de transferências por fuga de contexto (últimos 30 dias)';

COMMENT ON VIEW public.top_escape_steps IS 
'PR #13: Top 10 passos/cenários com mais fugas de contexto';