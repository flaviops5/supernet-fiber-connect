-- ===================================================
-- View: QA Dashboard Summary
-- Consolida resultados dos testes LLM por categoria
-- ===================================================

CREATE OR REPLACE VIEW qa_dashboard_summary AS
SELECT
  category,
  ROUND(AVG(routing_score)::numeric, 2) AS routing_avg,
  ROUND(AVG(clarity_score)::numeric, 2) AS clarity_avg,
  ROUND(AVG(context_score)::numeric, 2) AS context_avg,
  ROUND(AVG(tone_score)::numeric, 2) AS tone_avg,
  ROUND(AVG(timing_score)::numeric, 2) AS timing_avg,
  ROUND(AVG((
    COALESCE(routing_score, 0) + 
    COALESCE(clarity_score, 0) + 
    COALESCE(context_score, 0) + 
    COALESCE(tone_score, 0) + 
    COALESCE(timing_score, 0)
  ) / 5.0)::numeric, 2) AS score_medio,
  ROUND((SUM(CASE WHEN pass THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 2) AS taxa_sucesso_pct,
  COUNT(*) AS total_testes,
  MAX(created_at) AS ultimo_teste
FROM public.llm_test_results
WHERE created_at >= NOW() - INTERVAL '7 days'  -- Últimos 7 dias
GROUP BY category
ORDER BY taxa_sucesso_pct ASC;  -- Piores primeiro

COMMENT ON VIEW qa_dashboard_summary IS 
'Dashboard consolidado de testes LLM por categoria, últimos 7 dias';

-- ===================================================
-- View: Últimas Falhas Detalhadas
-- Lista os 50 testes mais recentes que falharam
-- ===================================================

CREATE OR REPLACE VIEW qa_latest_failures AS
SELECT
  id,
  scenario,
  category,
  expected_agent,
  detected_agent,
  routing_score,
  clarity_score,
  context_score,
  tone_score,
  timing_score,
  confidence,
  LEFT(response, 150) AS resposta_preview,
  LEFT(evaluation, 200) AS avaliacao_preview,
  error_details,
  latency_ms,
  created_at
FROM public.llm_test_results
WHERE pass = false
ORDER BY created_at DESC
LIMIT 50;

COMMENT ON VIEW qa_latest_failures IS 
'50 testes LLM mais recentes que falharam, com detalhes';