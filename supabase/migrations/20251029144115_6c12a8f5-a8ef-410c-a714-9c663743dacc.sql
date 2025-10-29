-- PR23 Fix: Correção de GROUP BY e adição de cidade em support_loops

-- Drop views para recriá-las
DROP VIEW IF EXISTS support_critical_clusters;
DROP VIEW IF EXISTS support_loops;
DROP VIEW IF EXISTS support_power_loss_clusters;

-- 1️⃣ Corrigir View de Clusters Críticos (usar alias no GROUP BY)
CREATE VIEW support_critical_clusters AS
SELECT
  detalhes->>'cidade' AS cidade,
  COUNT(*) AS incidents,
  MIN(created_at) AS first_seen_at,
  MAX(created_at) AS last_seen_at
FROM registros_de_monitoramento
WHERE acao = 'scenario_d_detected'
  AND detalhes->>'cidade' IS NOT NULL
  AND created_at >= now() - interval '30 minutes'
GROUP BY cidade
HAVING COUNT(*) >= 5;

-- 2️⃣ Adicionar campo cidade na View de Loops de Suporte
CREATE VIEW support_loops AS
SELECT
  conversation_id,
  detalhes->>'cidade' AS cidade,
  COUNT(*) AS loop_count,
  MAX(created_at) AS last_event
FROM registros_de_monitoramento
WHERE acao LIKE '%scenario%'
  AND created_at >= now() - interval '24 hours'
GROUP BY conversation_id, cidade
HAVING COUNT(*) >= 2;

-- 3️⃣ Corrigir View de Dying Gasp Cluster (usar alias no GROUP BY)
CREATE VIEW support_power_loss_clusters AS
SELECT
  detalhes->>'cidade' AS cidade,
  COUNT(*) AS loss_count,
  MAX(created_at) AS last_event
FROM registros_de_monitoramento
WHERE acao = 'dying_gasp_detected'
  AND detalhes->>'cidade' IS NOT NULL
  AND created_at >= now() - interval '20 minutes'
GROUP BY cidade
HAVING COUNT(*) >= 3;

-- Restaurar permissões
GRANT SELECT ON support_critical_clusters TO authenticated;
GRANT SELECT ON support_loops TO authenticated;
GRANT SELECT ON support_power_loss_clusters TO authenticated;