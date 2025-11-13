# 📊 Distributed Tracing - Analytics Queries

Queries SQL para análise de traces, performance e debugging usando `monitoring_logs`.

---

## 🔍 Queries de Rastreamento

### 1. Ver Trace Completo (Request Flow)

```sql
-- Ver todos os logs de um trace_id específico
SELECT 
  timestamp,
  agent_name,
  level,
  message,
  metadata->>'duration_ms' as duration_ms,
  metadata
FROM monitoring_logs
WHERE metadata->>'trace_id' = 'YOUR_TRACE_ID'
ORDER BY timestamp ASC;
```

### 2. Traces Mais Recentes

```sql
-- Últimos 50 traces únicos
SELECT DISTINCT ON (metadata->>'trace_id')
  metadata->>'trace_id' as trace_id,
  agent_name,
  timestamp,
  message,
  metadata->>'duration_ms' as duration_ms
FROM monitoring_logs
WHERE metadata->>'trace_id' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY metadata->>'trace_id', timestamp DESC
LIMIT 50;
```

### 3. Traces com Múltiplas Functions

```sql
-- Traces que passaram por várias edge functions
SELECT 
  metadata->>'trace_id' as trace_id,
  count(DISTINCT agent_name) as num_functions,
  array_agg(DISTINCT agent_name) as functions,
  min(timestamp) as started_at,
  max(timestamp) as ended_at,
  extract(epoch from (max(timestamp) - min(timestamp))) * 1000 as total_duration_ms
FROM monitoring_logs
WHERE metadata->>'trace_id' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY metadata->>'trace_id'
HAVING count(DISTINCT agent_name) > 1
ORDER BY total_duration_ms DESC;
```

---

## ⏱️ Queries de Performance

### 4. P50/P95/P99 Latency por Function

```sql
-- Percentis de latência por edge function
SELECT 
  agent_name,
  count(*) as total_requests,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric), 2) as p50_ms,
  round(percentile_cont(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric), 2) as p95_ms,
  round(percentile_cont(0.99) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric), 2) as p99_ms,
  round(avg((metadata->>'duration_ms')::numeric), 2) as avg_ms,
  round(max((metadata->>'duration_ms')::numeric), 2) as max_ms
FROM monitoring_logs
WHERE metadata->>'duration_ms' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY agent_name
ORDER BY p99_ms DESC;
```

### 5. Traces Lentos (> 1s)

```sql
-- Identificar traces com duração total > 1000ms
SELECT 
  metadata->>'trace_id' as trace_id,
  agent_name,
  round(sum((metadata->>'duration_ms')::numeric), 2) as total_duration_ms,
  count(*) as num_operations,
  array_agg(message ORDER BY timestamp) as operations,
  min(timestamp) as started_at
FROM monitoring_logs
WHERE metadata->>'trace_id' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY metadata->>'trace_id', agent_name
HAVING sum((metadata->>'duration_ms')::numeric) > 1000
ORDER BY total_duration_ms DESC
LIMIT 20;
```

### 6. Top Operações Mais Lentas

```sql
-- Top 20 operações por latência P95
SELECT 
  agent_name,
  message,
  count(*) as occurrences,
  round(percentile_cont(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric), 2) as p95_ms,
  round(avg((metadata->>'duration_ms')::numeric), 2) as avg_ms
FROM monitoring_logs
WHERE metadata->>'duration_ms' IS NOT NULL
  AND message NOT LIKE '%completed%' -- Filtrar logs de completion
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY agent_name, message
HAVING count(*) > 10 -- Mínimo 10 ocorrências
ORDER BY p95_ms DESC
LIMIT 20;
```

### 7. Performance por Hora do Dia

```sql
-- Latência média por hora (identificar horários de pico)
SELECT 
  extract(hour from timestamp) as hour,
  agent_name,
  count(*) as requests,
  round(avg((metadata->>'duration_ms')::numeric), 2) as avg_ms,
  round(percentile_cont(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric), 2) as p95_ms
FROM monitoring_logs
WHERE metadata->>'duration_ms' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY extract(hour from timestamp), agent_name
ORDER BY hour, agent_name;
```

---

## 🚨 Queries de Erros

### 8. Traces com Erros

```sql
-- Traces que tiveram erros e sua duração
SELECT 
  metadata->>'trace_id' as trace_id,
  agent_name,
  max((metadata->>'duration_ms')::numeric) as duration_ms,
  count(*) FILTER (WHERE level = 'error') as error_count,
  count(*) FILTER (WHERE level = 'warn') as warning_count,
  array_agg(DISTINCT message) FILTER (WHERE level = 'error') as error_messages,
  min(timestamp) as started_at
FROM monitoring_logs
WHERE metadata->>'trace_id' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY metadata->>'trace_id', agent_name
HAVING count(*) FILTER (WHERE level = 'error') > 0
ORDER BY error_count DESC, duration_ms DESC
LIMIT 50;
```

### 9. Error Rate por Function

```sql
-- Taxa de erro por edge function (últimas 24h)
SELECT 
  agent_name,
  count(*) as total_requests,
  count(*) FILTER (WHERE level = 'error') as errors,
  count(*) FILTER (WHERE level = 'warn') as warnings,
  round(count(*) FILTER (WHERE level = 'error')::numeric / count(*)::numeric * 100, 2) as error_rate_percent,
  array_agg(DISTINCT message) FILTER (WHERE level = 'error') as error_types
FROM monitoring_logs
WHERE metadata->>'trace_id' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY agent_name
ORDER BY error_rate_percent DESC;
```

### 10. Erros Frequentes (Top 10)

```sql
-- Erros mais comuns com contexto
SELECT 
  agent_name,
  message,
  count(*) as occurrences,
  array_agg(DISTINCT metadata->>'error') FILTER (WHERE metadata->>'error' IS NOT NULL) as error_messages,
  min(timestamp) as first_seen,
  max(timestamp) as last_seen
FROM monitoring_logs
WHERE level = 'error'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY agent_name, message
ORDER BY occurrences DESC
LIMIT 10;
```

---

## 📈 Queries de Tendências

### 11. Throughput por Function (Requests/min)

```sql
-- Requests por minuto nas últimas 24h
SELECT 
  date_trunc('minute', timestamp) as minute,
  agent_name,
  count(*) as requests_per_minute
FROM monitoring_logs
WHERE metadata->>'trace_id' IS NOT NULL
  AND message LIKE '%started%' OR message LIKE '%invoked%'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('minute', timestamp), agent_name
ORDER BY minute DESC, agent_name;
```

### 12. Latência ao Longo do Tempo

```sql
-- Latência P95 por hora (últimas 24h)
SELECT 
  date_trunc('hour', timestamp) as hour,
  agent_name,
  count(*) as requests,
  round(percentile_cont(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric), 2) as p95_ms
FROM monitoring_logs
WHERE metadata->>'duration_ms' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', timestamp), agent_name
ORDER BY hour DESC, agent_name;
```

### 13. Crescimento de Uso

```sql
-- Comparar últimas 7 dias vs 7 dias anteriores
WITH current_week AS (
  SELECT 
    agent_name,
    count(*) as requests
  FROM monitoring_logs
  WHERE timestamp > NOW() - INTERVAL '7 days'
  GROUP BY agent_name
),
previous_week AS (
  SELECT 
    agent_name,
    count(*) as requests
  FROM monitoring_logs
  WHERE timestamp BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
  GROUP BY agent_name
)
SELECT 
  c.agent_name,
  c.requests as current_week_requests,
  p.requests as previous_week_requests,
  c.requests - p.requests as difference,
  round((c.requests::numeric - p.requests::numeric) / p.requests::numeric * 100, 2) as growth_percent
FROM current_week c
LEFT JOIN previous_week p ON c.agent_name = p.agent_name
ORDER BY growth_percent DESC NULLS LAST;
```

---

## 🔎 Queries de Debugging

### 14. Encontrar Trace por Contexto

```sql
-- Buscar trace_id baseado em metadata
SELECT 
  metadata->>'trace_id' as trace_id,
  timestamp,
  agent_name,
  message,
  metadata
FROM monitoring_logs
WHERE metadata->>'user_id' = 'USER_ID_HERE'
  -- OU metadata->>'request_id' = 'REQUEST_ID_HERE'
  -- OU message LIKE '%search_term%'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

### 15. Operações Incompletas (Sem Completion Log)

```sql
-- Traces que iniciaram mas não completaram (possível timeout)
WITH started AS (
  SELECT DISTINCT metadata->>'trace_id' as trace_id
  FROM monitoring_logs
  WHERE message LIKE '%started%' OR message LIKE '%invoked%'
    AND timestamp > NOW() - INTERVAL '1 hour'
),
completed AS (
  SELECT DISTINCT metadata->>'trace_id' as trace_id
  FROM monitoring_logs
  WHERE message LIKE '%completed%'
    AND timestamp > NOW() - INTERVAL '1 hour'
)
SELECT 
  s.trace_id,
  ml.agent_name,
  ml.timestamp as started_at,
  extract(epoch from (NOW() - ml.timestamp)) * 1000 as age_ms
FROM started s
LEFT JOIN completed c ON s.trace_id = c.trace_id
JOIN monitoring_logs ml ON ml.metadata->>'trace_id' = s.trace_id
WHERE c.trace_id IS NULL
  AND ml.message LIKE '%started%'
ORDER BY ml.timestamp DESC;
```

### 16. Análise de Checkpoints

```sql
-- Breakdown de checkpoints de um trace
SELECT 
  timestamp,
  message,
  metadata->>'duration_ms' as checkpoint_duration_ms,
  metadata->'breakdown' as breakdown
FROM monitoring_logs
WHERE metadata->>'trace_id' = 'YOUR_TRACE_ID'
  AND metadata->'breakdown' IS NOT NULL
ORDER BY timestamp;
```

---

## 📊 Queries de Dashboard

### 17. Health Score Global

```sql
-- Métricas gerais das últimas 24h
SELECT 
  count(DISTINCT metadata->>'trace_id') as total_traces,
  count(*) as total_logs,
  count(*) FILTER (WHERE level = 'error') as total_errors,
  count(*) FILTER (WHERE level = 'warn') as total_warnings,
  round(avg((metadata->>'duration_ms')::numeric), 2) as avg_duration_ms,
  round(percentile_cont(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric), 2) as p95_duration_ms,
  count(DISTINCT agent_name) as active_functions
FROM monitoring_logs
WHERE timestamp > NOW() - INTERVAL '24 hours';
```

### 18. Top 5 Slowest Traces (Últimas 24h)

```sql
-- Top 5 traces mais lentos com detalhes
WITH trace_durations AS (
  SELECT 
    metadata->>'trace_id' as trace_id,
    agent_name,
    max((metadata->>'duration_ms')::numeric) as max_duration_ms,
    min(timestamp) as started_at,
    max(timestamp) as ended_at,
    count(*) as log_count
  FROM monitoring_logs
  WHERE metadata->>'trace_id' IS NOT NULL
    AND timestamp > NOW() - INTERVAL '24 hours'
  GROUP BY metadata->>'trace_id', agent_name
)
SELECT 
  trace_id,
  agent_name,
  max_duration_ms,
  started_at,
  log_count
FROM trace_durations
ORDER BY max_duration_ms DESC
LIMIT 5;
```

### 19. SLA Compliance (% requests < 1s)

```sql
-- Percentual de requests dentro do SLA (< 1000ms)
SELECT 
  agent_name,
  count(*) as total_requests,
  count(*) FILTER (WHERE (metadata->>'duration_ms')::numeric < 1000) as within_sla,
  round(count(*) FILTER (WHERE (metadata->>'duration_ms')::numeric < 1000)::numeric / count(*)::numeric * 100, 2) as sla_compliance_percent
FROM monitoring_logs
WHERE metadata->>'duration_ms' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY agent_name
ORDER BY sla_compliance_percent ASC;
```

---

## 🧹 Queries de Manutenção

### 20. Limpar Logs Antigos

```sql
-- Deletar logs mais antigos que 30 dias
DELETE FROM monitoring_logs
WHERE timestamp < NOW() - INTERVAL '30 days';
```

### 21. Estatísticas de Storage

```sql
-- Tamanho da tabela e índices
SELECT 
  pg_size_pretty(pg_total_relation_size('monitoring_logs')) as total_size,
  pg_size_pretty(pg_relation_size('monitoring_logs')) as table_size,
  pg_size_pretty(pg_total_relation_size('monitoring_logs') - pg_relation_size('monitoring_logs')) as indexes_size,
  (SELECT count(*) FROM monitoring_logs) as total_rows,
  (SELECT count(DISTINCT metadata->>'trace_id') FROM monitoring_logs) as unique_traces;
```

---

## 💡 Dicas de Uso

### Criar Views para Queries Frequentes

```sql
-- View: Traces recentes
CREATE VIEW recent_traces AS
SELECT DISTINCT ON (metadata->>'trace_id')
  metadata->>'trace_id' as trace_id,
  agent_name,
  timestamp,
  metadata->>'duration_ms' as duration_ms
FROM monitoring_logs
WHERE metadata->>'trace_id' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY metadata->>'trace_id', timestamp DESC;

-- View: Error summary
CREATE VIEW error_summary AS
SELECT 
  agent_name,
  count(*) as error_count,
  max(timestamp) as last_error_at,
  array_agg(DISTINCT message) as error_types
FROM monitoring_logs
WHERE level = 'error'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY agent_name;
```

### Índices Recomendados

```sql
-- Índice em trace_id (GIN para JSONB)
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_trace_id 
ON monitoring_logs USING GIN ((metadata->'trace_id'));

-- Índice em duration_ms
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_duration 
ON monitoring_logs ((metadata->>'duration_ms'));

-- Índice composto para queries de performance
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_perf 
ON monitoring_logs (agent_name, timestamp DESC, level) 
WHERE metadata->>'duration_ms' IS NOT NULL;
```

---

**Última Atualização**: 2025-11-13  
**Próxima Revisão**: Após uso em produção  
**Responsável**: DevOps Team
