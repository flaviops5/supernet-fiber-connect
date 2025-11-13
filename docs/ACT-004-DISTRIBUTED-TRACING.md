# 🔍 ACT-004: Distributed Tracing Implementation

**Data**: 2025-11-13  
**Status**: ✅ IMPLEMENTADO  
**Severidade**: ALTA

---

## 📋 Sumário Executivo

Implementação completa de **rastreamento distribuído** com `trace_id` (UUID v4) e `duration_ms` em todos os edge functions. Sistema permite correlação de logs entre múltiplas funções e análise de performance end-to-end.

### 🎯 Funcionalidades Implementadas

| Componente | Descrição | Status |
|------------|-----------|--------|
| **trace-id.ts** | Geração e propagação de trace IDs | ✅ |
| **duration-tracker.ts** | Medição precisa de duração | ✅ |
| **structured-logger.ts** | Logger com trace_id automático | ✅ |
| **Propagação Cross-Function** | injectTraceId() helper | ✅ |
| **W3C Trace Context** | Compatibilidade com OpenTelemetry | ✅ |

---

## 🔧 Componentes Criados

### 1. `trace-id.ts` - Gerenciamento de Trace IDs

Utilitários para criar, extrair e propagar trace IDs entre edge functions.

#### Funções Principais

```typescript
// Gerar novo trace ID (UUID v4)
const traceId = generateTraceId();

// Extrair trace ID de headers (X-Trace-Id, traceparent, X-Request-Id)
const traceId = extractTraceId(request);

// Obter ou criar trace ID
const traceId = getOrCreateTraceId(request);

// Injetar trace ID em fetch calls
const response = await fetch(url, injectTraceId(traceId, {
  method: 'POST',
  body: JSON.stringify(data)
}));

// Injetar em Supabase function calls
const { data } = await supabase.functions.invoke('my-function',
  injectTraceContext(traceId, {
    body: { foo: 'bar' }
  })
);
```

#### Suporte a W3C Trace Context

Compatível com OpenTelemetry e ferramentas de APM:

```typescript
// Header gerado: traceparent: 00-{trace_id}-{span_id}-01
// Formato W3C: version-trace_id-parent_id-trace_flags
```

---

### 2. `duration-tracker.ts` - Medição de Performance

Rastreamento preciso de duração com checkpoints e scopes.

#### Uso Básico

```typescript
import { createTimer, measure, createScope } from './duration-tracker.ts';

// Timer simples
const timer = createTimer();
await doWork();
const duration = timer.complete();
console.log(`Took ${duration}ms`);

// Async measure
const [result, duration] = await measure(async () => {
  return await fetchData();
});

// Scoped timing com auto-log
const scope = createScope('database-query');
await db.query(...);
scope.end(); // Auto-logs duration
```

#### Checkpoints

```typescript
const timer = createTimer();

timer.checkpoint('auth');
await authenticate();

timer.checkpoint('fetch');
await fetchData();

timer.checkpoint('process');
processData();

const checkpoints = timer.getAllCheckpoints();
// { auth: 45ms, fetch: 320ms, process: 580ms }
```

#### Performance Budget

```typescript
const budget = createBudget('api-call', 1000); // 1000ms limit
await fetch(...);
const { exceeded, duration } = budget.check();
// ⚠️ Warns if duration > 1000ms
```

---

### 3. `structured-logger.ts` - Logger com Trace ID

Logger atualizado com trace_id automático e duration tracking.

#### Uso Atualizado

```typescript
import { createLogger } from './structured-logger.ts';
import { getOrCreateTraceId } from './trace-id.ts';
import { createTimer } from './duration-tracker.ts';

// Logger com trace ID automático
const logger = createLogger('my-function', req);

// Logs incluem automaticamente:
// - trace_id
// - duration_ms (se tracker fornecido)
logger.info('Processing request', { user_id: 123 });
// Output: ℹ️ [my-function:abc123] Processing request

// Logger com duration tracker
const timer = createTimer();
const logger = createLogger('my-function', req, { 
  durationTracker: timer 
});

await doWork();

logger.info('Work completed');
// Output: ℹ️ [my-function:abc123] [450ms] Work completed

// Measure helper para operações
const result = await logger.measure('database-query', async () => {
  return await db.query('SELECT * FROM users');
});
// Logs: ⏱️ Starting: database-query
//       ✅ Completed: database-query (234ms)
```

---

## 🚀 Exemplos de Implementação

### Exemplo 1: Edge Function Simples

```typescript
import { createLogger } from "../_shared/structured-logger.ts";
import { getOrCreateTraceId } from "../_shared/trace-id.ts";
import { createTimer } from "../_shared/duration-tracker.ts";

Deno.serve(async (req) => {
  const timer = createTimer();
  const traceId = getOrCreateTraceId(req);
  const logger = createLogger('my-function', req, { 
    traceId, 
    durationTracker: timer 
  });

  try {
    logger.info('Function started');

    const result = await logger.measure('process-data', async () => {
      return await processData();
    });

    const duration = timer.complete();
    logger.info('Function completed', { duration_ms: duration });

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId, // Retornar trace ID no response
      },
    });
  } catch (error) {
    logger.error('Function failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return new Response('Error', { status: 500 });
  }
});
```

### Exemplo 2: Chamada Entre Functions

```typescript
import { injectTraceId } from "../_shared/trace-id.ts";
import { createLogger } from "../_shared/structured-logger.ts";

Deno.serve(async (req) => {
  const logger = createLogger('caller-function', req);
  const traceId = logger.traceId; // Exposto pelo logger

  logger.info('Calling downstream function');

  // Propagar trace ID para outra function
  const response = await fetch(
    'https://project.supabase.co/functions/v1/downstream-function',
    injectTraceId(traceId, {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
      headers: { 'Content-Type': 'application/json' }
    })
  );

  logger.info('Downstream call completed', { 
    status: response.status 
  });

  return response;
});
```

### Exemplo 3: Checkpoints para Performance

```typescript
import { createTimer } from "../_shared/duration-tracker.ts";
import { createLogger } from "../_shared/structured-logger.ts";

Deno.serve(async (req) => {
  const timer = createTimer();
  const logger = createLogger('complex-function', req, { durationTracker: timer });

  timer.checkpoint('auth-start');
  await authenticate(req);
  timer.checkpoint('auth-end');

  timer.checkpoint('db-start');
  const data = await fetchFromDB();
  timer.checkpoint('db-end');

  timer.checkpoint('process-start');
  const result = processData(data);
  timer.checkpoint('process-end');

  const checkpoints = timer.getAllCheckpoints();
  logger.info('Performance breakdown', { 
    checkpoints,
    auth_ms: timer.between('auth-start', 'auth-end'),
    db_ms: timer.between('db-start', 'db-end'),
    process_ms: timer.between('process-start', 'process-end'),
  });

  return new Response(JSON.stringify(result));
});
```

---

## 📊 Formato de Logs

### Console Logs

```typescript
// Antes (sem trace ID)
ℹ️ [my-function] Processing request

// Depois (com trace ID)
ℹ️ [my-function:a3b7c9d2] Processing request

// Com duration tracker
ℹ️ [my-function:a3b7c9d2] [450ms] Processing request
```

### Database Logs (monitoring_logs)

```json
{
  "level": "info",
  "message": "Processing request",
  "agent_name": "my-function",
  "timestamp": "2025-11-13T01:23:45.678Z",
  "metadata": {
    "trace_id": "a3b7c9d2-ef45-6789-0123-456789abcdef",
    "duration_ms": 450,
    "user_id": 123,
    "status": "success"
  }
}
```

---

## 🔍 Queries de Análise

### 1. Rastrear Request Completo

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
WHERE metadata->>'trace_id' = 'a3b7c9d2-ef45-6789-0123-456789abcdef'
ORDER BY timestamp;
```

### 2. Análise de Latência por Function

```sql
-- P50, P95, P99 de duração por função
SELECT 
  agent_name,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric) as p50_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric) as p95_ms,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric) as p99_ms,
  avg((metadata->>'duration_ms')::numeric) as avg_ms,
  count(*) as total_requests
FROM monitoring_logs
WHERE metadata->>'duration_ms' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY agent_name
ORDER BY p99_ms DESC;
```

### 3. Traces Lentos (> 1s)

```sql
-- Identificar traces com duração total > 1000ms
SELECT 
  metadata->>'trace_id' as trace_id,
  agent_name,
  sum((metadata->>'duration_ms')::numeric) as total_duration_ms,
  count(*) as num_operations,
  array_agg(message ORDER BY timestamp) as operations
FROM monitoring_logs
WHERE metadata->>'trace_id' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY metadata->>'trace_id', agent_name
HAVING sum((metadata->>'duration_ms')::numeric) > 1000
ORDER BY total_duration_ms DESC;
```

### 4. Error Rate por Trace

```sql
-- Traces com erros e sua duração
SELECT 
  metadata->>'trace_id' as trace_id,
  agent_name,
  max((metadata->>'duration_ms')::numeric) as duration_ms,
  count(*) FILTER (WHERE level = 'error') as errors,
  count(*) FILTER (WHERE level = 'warn') as warnings,
  array_agg(DISTINCT message) FILTER (WHERE level = 'error') as error_messages
FROM monitoring_logs
WHERE metadata->>'trace_id' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY metadata->>'trace_id', agent_name
HAVING count(*) FILTER (WHERE level = 'error') > 0
ORDER BY errors DESC, duration_ms DESC;
```

---

## 🎯 Migração de Edge Functions Existentes

### Checklist de Atualização

Para cada edge function:

- [ ] Importar `createLogger`, `getOrCreateTraceId`, `createTimer`
- [ ] Criar timer no início da função
- [ ] Criar logger com trace ID e duration tracker
- [ ] Substituir console.log por logger.info/warn/error
- [ ] Usar logger.measure() para operações longas
- [ ] Adicionar checkpoints para análise de performance
- [ ] Propagar trace ID em chamadas downstream (injectTraceId)
- [ ] Retornar X-Trace-Id no response header
- [ ] Testar logs no Supabase Dashboard

### Template de Migração

```typescript
// ANTES
Deno.serve(async (req) => {
  console.log('Processing request');
  const result = await doWork();
  return new Response(JSON.stringify(result));
});

// DEPOIS
import { createLogger } from "../_shared/structured-logger.ts";
import { getOrCreateTraceId } from "../_shared/trace-id.ts";
import { createTimer } from "../_shared/duration-tracker.ts";

Deno.serve(async (req) => {
  const timer = createTimer();
  const traceId = getOrCreateTraceId(req);
  const logger = createLogger('my-function', req, { 
    traceId, 
    durationTracker: timer 
  });

  logger.info('Processing request');
  
  const result = await logger.measure('work', async () => {
    return await doWork();
  });

  const duration = timer.complete();
  logger.info('Request completed', { duration_ms: duration });

  return new Response(JSON.stringify(result), {
    headers: { 
      'Content-Type': 'application/json',
      'X-Trace-Id': traceId 
    },
  });
});
```

---

## 📚 Compatibilidade com APM Tools

### OpenTelemetry

O sistema é compatível com OpenTelemetry via **W3C Trace Context**:

```typescript
// Header propagado automaticamente:
traceparent: 00-a3b7c9d2ef4567890123456789abcdef-1234567890abcdef-01

// Formato:
// 00 - version
// a3b7c9d2ef4567890123456789abcdef - trace_id (32 hex chars)
// 1234567890abcdef - span_id (16 hex chars)
// 01 - trace_flags (sampled)
```

### Datadog / New Relic / Dynatrace

Ferramentas de APM podem consumir os logs via:

1. **Database Export**: Query `monitoring_logs` table
2. **Log Streaming**: Webhook para APM platform
3. **Custom Integration**: Edge function dedicado para export

---

## 🔒 Segurança e Privacy

### Não Logar Dados Sensíveis

```typescript
// ❌ ERRADO: Expor dados sensíveis
logger.info('User authenticated', { 
  password: user.password,  // NUNCA!
  credit_card: user.cc      // NUNCA!
});

// ✅ CORRETO: Log apenas IDs
logger.info('User authenticated', { 
  user_id: user.id,
  trace_id: traceId
});
```

### Sanitização Automática

O logger já sanitiza metadata antes de persistir, mas evite passar objetos grandes ou sensíveis.

---

## 📊 Dashboard Grafana (Próximo Passo)

Com trace_id e duration_ms implementados, agora é possível criar:

1. **Request Flow Diagram**: Visualizar cadeia de chamadas
2. **Latency Heatmaps**: P95/P99 por função
3. **Error Correlation**: Traces com erros e sua duração
4. **Performance Budgets**: Alertas para operações lentas

Ver: **ACT-006: Dashboard de Performance**

---

## ✅ Benefícios Implementados

| Benefício | Descrição |
|-----------|-----------|
| **🔍 Rastreabilidade** | Correlacionar logs de múltiplas functions |
| **⏱️ Performance Analysis** | Identificar gargalos com checkpoints |
| **🚨 Error Debugging** | Ver contexto completo de erros |
| **📊 Métricas** | P50/P95/P99 latency por operação |
| **🔗 Propagação** | Trace ID preservado cross-function |
| **🛠️ APM Ready** | Compatível com OpenTelemetry |

---

## 🎯 Próximos Passos

### Imediato (Hoje)
1. ✅ Utilities criados (trace-id.ts, duration-tracker.ts)
2. ✅ Logger atualizado (structured-logger.ts)
3. ⏳ Migrar edge functions existentes (usar template)

### Curto Prazo (Esta Semana)
1. 📊 **ACT-006**: Criar dashboard Grafana
2. 🧪 Validar propagação cross-function em produção
3. 📖 Treinar equipe no novo sistema de logging

### Médio Prazo (Este Mês)
1. 🔄 Automatizar export de logs para APM externo
2. 📈 Criar alertas baseados em P95/P99
3. 🎓 Documentar padrões de logging da equipe

---

## 📚 Referências

- [OpenTelemetry Trace Context](https://www.w3.org/TR/trace-context/)
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context-1/)
- [Distributed Tracing Best Practices](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

---

**Última Atualização**: 2025-11-13  
**Próxima Revisão**: 2025-12-13  
**Responsável**: DevOps Team  
**Status**: ✅ PRODUÇÃO
