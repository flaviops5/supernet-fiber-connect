-- ============================================
-- MIGRAÇÃO: Sistema de KPIs para Suporte Técnico
-- Data: 2025-10-27
-- Descrição: Views SQL otimizadas + índices para análise de métricas
-- ============================================

-- 1. Criar índice para otimizar consultas de KPI
CREATE INDEX IF NOT EXISTS idx_monitoring_kpi 
ON registros_de_monitoramento(fluxo, timestamp DESC)
WHERE fluxo = 'support-tech';

-- 2. View principal: KPIs por dia
CREATE OR REPLACE VIEW dashboard_suporte_kpis AS
SELECT
  DATE_TRUNC('day', (timestamp AT TIME ZONE 'UTC'))::date AS dia,
  COUNT(*) AS total_logs,
  COUNT(*) FILTER (WHERE (detalhes->>'resolved')::boolean IS TRUE) AS total_resolvidos,
  COUNT(*) FILTER (WHERE (detalhes->>'escalated')::boolean IS TRUE) AS total_escalados,
  COUNT(*) FILTER (WHERE COALESCE(detalhes->>'hybrid_mode','OFF') = 'ON') AS total_hibrido,
  COUNT(*) FILTER (WHERE detalhes->>'scenario_completed' = 'A') AS total_a,
  COUNT(*) FILTER (WHERE detalhes->>'scenario_completed' = 'B') AS total_b,
  COUNT(*) FILTER (WHERE detalhes->>'scenario_completed' = 'C') AS total_c,
  COUNT(*) FILTER (WHERE detalhes->>'scenario_completed' = 'D') AS total_d
FROM registros_de_monitoramento
WHERE fluxo = 'support-tech'
  AND acao = 'kpi_update'
GROUP BY 1
ORDER BY 1 DESC;

-- 3. View resumo: KPIs agregados (todo o período)
CREATE OR REPLACE VIEW dashboard_suporte_kpis_summary AS
SELECT
  COUNT(*) AS total_logs,
  COUNT(*) FILTER (WHERE (detalhes->>'resolved')::boolean IS TRUE) AS total_resolvidos,
  COUNT(*) FILTER (WHERE (detalhes->>'escalated')::boolean IS TRUE) AS total_escalados,
  COUNT(*) FILTER (WHERE COALESCE(detalhes->>'hybrid_mode','OFF') = 'ON') AS total_hibrido,
  -- Taxa de resolução (MSR - Message Success Rate)
  ROUND(
    (COUNT(*) FILTER (WHERE (detalhes->>'resolved')::boolean IS TRUE)::numeric / 
     NULLIF(COUNT(*),0)) * 100, 
    2
  ) AS msr_percent,
  -- Taxa de escalação
  ROUND(
    (COUNT(*) FILTER (WHERE (detalhes->>'escalated')::boolean IS TRUE)::numeric / 
     NULLIF(COUNT(*),0)) * 100, 
    2
  ) AS taxa_escalacao_percent,
  -- Uso do modo híbrido
  ROUND(
    (COUNT(*) FILTER (WHERE COALESCE(detalhes->>'hybrid_mode','OFF') = 'ON')::numeric / 
     NULLIF(COUNT(*),0)) * 100, 
    2
  ) AS uso_hibrido_percent,
  -- Distribuição por cenário
  COUNT(*) FILTER (WHERE detalhes->>'scenario_completed' = 'A') AS total_cenario_a,
  COUNT(*) FILTER (WHERE detalhes->>'scenario_completed' = 'B') AS total_cenario_b,
  COUNT(*) FILTER (WHERE detalhes->>'scenario_completed' = 'C') AS total_cenario_c,
  COUNT(*) FILTER (WHERE detalhes->>'scenario_completed' = 'D') AS total_cenario_d
FROM registros_de_monitoramento
WHERE fluxo = 'support-tech'
  AND acao = 'kpi_update';

-- 4. View: Comparação Híbrido vs Determinístico
CREATE OR REPLACE VIEW dashboard_hibrido_vs_deterministico AS
SELECT
  COALESCE(detalhes->>'hybrid_mode', 'OFF') AS modo,
  COUNT(*) AS total_atendimentos,
  COUNT(*) FILTER (WHERE (detalhes->>'resolved')::boolean IS TRUE) AS resolvidos,
  COUNT(*) FILTER (WHERE (detalhes->>'escalated')::boolean IS TRUE) AS escalados,
  ROUND(
    (COUNT(*) FILTER (WHERE (detalhes->>'resolved')::boolean IS TRUE)::numeric / 
     NULLIF(COUNT(*),0)) * 100, 
    2
  ) AS taxa_resolucao_percent,
  ROUND(
    (COUNT(*) FILTER (WHERE (detalhes->>'escalated')::boolean IS TRUE)::numeric / 
     NULLIF(COUNT(*),0)) * 100, 
    2
  ) AS taxa_escalacao_percent
FROM registros_de_monitoramento
WHERE fluxo = 'support-tech'
  AND acao = 'kpi_update'
GROUP BY 1
ORDER BY modo;