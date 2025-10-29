-- >>> PR23 Alertas Inteligentes

-- 1️⃣ View de Clusters Críticos
CREATE OR REPLACE VIEW support_critical_clusters AS
SELECT
  detalhes->>'cidade' AS cidade,
  COUNT(*) AS incidents,
  MIN(created_at) AS first_seen_at,
  MAX(created_at) AS last_seen_at
FROM registros_de_monitoramento
WHERE acao = 'scenario_d_detected'
  AND detalhes->>'cidade' IS NOT NULL
  AND created_at >= now() - interval '30 minutes'
GROUP BY detalhes->>'cidade'
HAVING COUNT(*) >= 5;

-- 2️⃣ View de Loops de Suporte
CREATE OR REPLACE VIEW support_loops AS
SELECT
  conversation_id,
  COUNT(*) AS loop_count,
  MAX(created_at) AS last_event
FROM registros_de_monitoramento
WHERE acao LIKE '%scenario%'
  AND created_at >= now() - interval '24 hours'
GROUP BY conversation_id
HAVING COUNT(*) >= 2;

-- 3️⃣ View de Dying Gasp Cluster (queda elétrica)
CREATE OR REPLACE VIEW support_power_loss_clusters AS
SELECT
  detalhes->>'cidade' AS cidade,
  COUNT(*) AS loss_count,
  MAX(created_at) AS last_event
FROM registros_de_monitoramento
WHERE acao = 'dying_gasp_detected'
  AND detalhes->>'cidade' IS NOT NULL
  AND created_at >= now() - interval '20 minutes'
GROUP BY detalhes->>'cidade'
HAVING COUNT(*) >= 3;

-- Garantir permissões para authenticated users
GRANT SELECT ON support_critical_clusters TO authenticated;
GRANT SELECT ON support_loops TO authenticated;
GRANT SELECT ON support_power_loss_clusters TO authenticated;

-- <<< PR23