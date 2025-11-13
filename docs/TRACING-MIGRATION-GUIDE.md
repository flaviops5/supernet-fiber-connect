# 🔄 Guia de Migração - Distributed Tracing

## Visão Geral

Este guia mostra como migrar edge functions existentes para usar o novo sistema de **rastreamento distribuído** com `trace_id` e `duration_ms`.

---

## 🎯 Objetivos da Migração

1. ✅ Adicionar trace_id automático em todos os logs
2. ✅ Medir duration_ms de operações
3. ✅ Propagar trace_id entre functions
4. ✅ Habilitar análise de performance P95/P99
5. ✅ Correlacionar logs de requests distribuídos

---

## 📦 Imports Necessários

```typescript
// Adicionar no topo de cada edge function
import { createLogger } from "../_shared/structured-logger.ts";
import { getOrCreateTraceId } from "../_shared/trace-id.ts";
import { createTimer } from "../_shared/duration-tracker.ts";
import { injectTraceId } from "../_shared/trace-id.ts"; // Para chamadas downstream
```

---

## 🔄 Padrão de Migração

### ANTES (Logging Antigo)

```typescript
// ❌ Logs sem trace_id e duration
Deno.serve(async (req) => {
  console.log('📥 Webhook endpoint hit');
  
  const data = await req.json();
  console.log('Processing data:', data);
  
  try {
    const result = await processData(data);
    console.log('✅ Processing completed');
    return new Response(JSON.stringify(result));
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response('Error', { status: 500 });
  }
});
```

### DEPOIS (Com Tracing)

```typescript
// ✅ Logs com trace_id e duration automático
import { createLogger } from "../_shared/structured-logger.ts";
import { getOrCreateTraceId } from "../_shared/trace-id.ts";
import { createTimer } from "../_shared/duration-tracker.ts";

Deno.serve(async (req) => {
  const timer = createTimer();
  const traceId = getOrCreateTraceId(req);
  const logger = createLogger('webhook-handler', req, { 
    traceId, 
    durationTracker: timer 
  });

  logger.info('Webhook endpoint hit', { 
    method: req.method,
    url: req.url 
  });
  
  const data = await req.json();
  logger.info('Processing data', { 
    dataKeys: Object.keys(data) 
  });
  
  try {
    const result = await logger.measure('process-data', async () => {
      return await processData(data);
    });
    
    const duration = timer.complete();
    logger.info('Processing completed', { 
      duration_ms: duration,
      result_size: JSON.stringify(result).length 
    });
    
    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId // Retornar trace ID
      }
    });
  } catch (error) {
    const duration = timer.complete();
    logger.error('Processing failed', { 
      duration_ms: duration,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return new Response('Error', { 
      status: 500,
      headers: { 'X-Trace-Id': traceId }
    });
  }
});
```

---

## 🔗 Propagação Entre Functions

### Cenário: Function A chama Function B

```typescript
// ========== FUNCTION A (Caller) ==========
import { createLogger } from "../_shared/structured-logger.ts";
import { injectTraceId } from "../_shared/trace-id.ts";

Deno.serve(async (req) => {
  const logger = createLogger('function-a', req);
  const traceId = logger.traceId;

  logger.info('Calling function B');

  // ✅ Propagar trace_id via headers
  const response = await fetch(
    'https://project.supabase.co/functions/v1/function-b',
    injectTraceId(traceId, {
      method: 'POST',
      body: JSON.stringify({ data: 'from-a' }),
      headers: { 
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
      }
    })
  );

  logger.info('Function B responded', { 
    status: response.status 
  });

  return response;
});

// ========== FUNCTION B (Callee) ==========
import { createLogger } from "../_shared/structured-logger.ts";
import { getOrCreateTraceId } from "../_shared/trace-id.ts";

Deno.serve(async (req) => {
  // ✅ Extrai trace_id propagado de A
  const traceId = getOrCreateTraceId(req); // Mesmo trace_id!
  const logger = createLogger('function-b', req, { traceId });

  logger.info('Received call from function A');

  const data = await req.json();
  logger.info('Processing data', { data });

  // Agora todos os logs de A e B compartilham o mesmo trace_id!
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'X-Trace-Id': traceId }
  });
});
```

**Resultado no DB**:
```sql
SELECT trace_id, agent_name, message, timestamp
FROM monitoring_logs
WHERE trace_id = 'abc-123-def'
ORDER BY timestamp;

-- trace_id      | agent_name  | message
-- abc-123-def   | function-a  | Calling function B
-- abc-123-def   | function-b  | Received call from function A
-- abc-123-def   | function-b  | Processing data
-- abc-123-def   | function-a  | Function B responded
```

---

## ⏱️ Performance Checkpoints

### Use Case: Analisar Gargalos

```typescript
import { createTimer } from "../_shared/duration-tracker.ts";
import { createLogger } from "../_shared/structured-logger.ts";

Deno.serve(async (req) => {
  const timer = createTimer();
  const logger = createLogger('complex-operation', req, { 
    durationTracker: timer 
  });

  // Checkpoint 1: Authentication
  timer.checkpoint('auth-start');
  const user = await authenticate(req);
  timer.checkpoint('auth-end');
  const authMs = timer.between('auth-start', 'auth-end');
  logger.info('Auth completed', { duration_ms: authMs });

  // Checkpoint 2: Database Query
  timer.checkpoint('db-start');
  const data = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
  timer.checkpoint('db-end');
  const dbMs = timer.between('db-start', 'db-end');
  logger.info('DB query completed', { duration_ms: dbMs });

  // Checkpoint 3: External API
  timer.checkpoint('api-start');
  const apiResult = await fetch('https://api.example.com/data');
  timer.checkpoint('api-end');
  const apiMs = timer.between('api-start', 'api-end');
  logger.info('API call completed', { duration_ms: apiMs });

  // Checkpoint 4: Processing
  timer.checkpoint('process-start');
  const result = processData(data);
  timer.checkpoint('process-end');
  const processMs = timer.between('process-start', 'process-end');
  logger.info('Processing completed', { duration_ms: processMs });

  const totalMs = timer.complete();
  
  // Log breakdown completo
  logger.info('Request completed', {
    total_ms: totalMs,
    breakdown: {
      auth_ms: authMs,
      db_ms: dbMs,
      api_ms: apiMs,
      process_ms: processMs,
      other_ms: totalMs - (authMs + dbMs + apiMs + processMs)
    }
  });

  return new Response(JSON.stringify(result));
});
```

**Query de Análise**:
```sql
-- Identificar gargalos por operação
SELECT 
  message,
  avg((metadata->>'duration_ms')::numeric) as avg_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric) as p95_ms
FROM monitoring_logs
WHERE agent_name = 'complex-operation'
  AND message IN ('Auth completed', 'DB query completed', 'API call completed', 'Processing completed')
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY message
ORDER BY p95_ms DESC;
```

---

## 📋 Checklist de Migração por Function

Para cada edge function em `supabase/functions/`:

### 1. Imports
- [ ] Adicionar `import { createLogger } from "../_shared/structured-logger.ts"`
- [ ] Adicionar `import { getOrCreateTraceId } from "../_shared/trace-id.ts"`
- [ ] Adicionar `import { createTimer } from "../_shared/duration-tracker.ts"`
- [ ] Adicionar `import { injectTraceId } from "../_shared/trace-id.ts"` (se chamar outras functions)

### 2. Setup Inicial
- [ ] Criar `const timer = createTimer()` no início
- [ ] Criar `const traceId = getOrCreateTraceId(req)`
- [ ] Criar `const logger = createLogger('function-name', req, { traceId, durationTracker: timer })`

### 3. Substituir Console Logs
- [ ] Trocar `console.log()` por `logger.info()`
- [ ] Trocar `console.warn()` por `logger.warn()`
- [ ] Trocar `console.error()` por `logger.error()`

### 4. Adicionar Medições
- [ ] Usar `logger.measure()` para operações longas (> 100ms)
- [ ] Adicionar checkpoints com `timer.checkpoint()` se necessário
- [ ] Logar `duration_ms` no final: `timer.complete()`

### 5. Propagação
- [ ] Usar `injectTraceId()` em chamadas fetch para outras functions
- [ ] Usar `injectTraceContext()` em chamadas `supabase.functions.invoke()`
- [ ] Retornar `X-Trace-Id` no response header

### 6. Testing
- [ ] Testar function localmente
- [ ] Verificar logs no Supabase Dashboard
- [ ] Confirmar trace_id aparece em todos os logs
- [ ] Validar duration_ms está sendo medido

---

## 🧪 Testing & Validation

### 1. Local Testing

```bash
# Executar function localmente
supabase functions serve function-name --no-verify-jwt

# Fazer request com trace ID customizado
curl -X POST http://localhost:54321/functions/v1/function-name \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: test-trace-123" \
  -d '{"test": "data"}'

# Verificar logs incluem test-trace-123
```

### 2. Validar no Supabase Dashboard

```sql
-- Ver logs recentes da function
SELECT 
  timestamp,
  level,
  message,
  metadata->>'trace_id' as trace_id,
  metadata->>'duration_ms' as duration_ms,
  metadata
FROM monitoring_logs
WHERE agent_name = 'function-name'
ORDER BY timestamp DESC
LIMIT 20;
```

### 3. Testar Propagação

```sql
-- Ver se trace_id é o mesmo entre functions
SELECT 
  metadata->>'trace_id' as trace_id,
  agent_name,
  message,
  timestamp
FROM monitoring_logs
WHERE metadata->>'trace_id' = 'test-trace-123'
ORDER BY timestamp;
```

---

## 🚨 Troubleshooting

### Problema: Trace ID não aparece nos logs

**Causa**: Logger criado sem opções  
**Solução**:
```typescript
// ❌ ERRADO
const logger = createLogger('my-function');

// ✅ CORRETO
const logger = createLogger('my-function', req);
// ou
const traceId = getOrCreateTraceId(req);
const logger = createLogger('my-function', req, { traceId });
```

### Problema: Duration sempre 0ms

**Causa**: Duration tracker não fornecido  
**Solução**:
```typescript
// ❌ ERRADO
const logger = createLogger('my-function', req);

// ✅ CORRETO
const timer = createTimer();
const logger = createLogger('my-function', req, { durationTracker: timer });
```

### Problema: Trace ID diferente entre functions

**Causa**: Não propagado via headers  
**Solução**:
```typescript
// ❌ ERRADO
await fetch(url, {
  method: 'POST',
  body: JSON.stringify(data)
});

// ✅ CORRETO
const traceId = logger.traceId;
await fetch(url, injectTraceId(traceId, {
  method: 'POST',
  body: JSON.stringify(data)
}));
```

---

## 📊 Métricas de Sucesso

Após migração, validar:

1. ✅ **100% dos logs** têm `trace_id`
2. ✅ **P95 latency** mensurável por função
3. ✅ **Traces distribuídos** correlacionáveis
4. ✅ **Checkpoints** identificam gargalos
5. ✅ **Error traces** têm contexto completo

---

## 🎯 Functions Prioritárias

Migrar nesta ordem (baseado em criticidade):

### Alta Prioridade
1. ✅ `whatsapp-webhook` (logs frequentes)
2. ✅ `ixc-proxy` (latência crítica)
3. ✅ `detect-mass-outage` (operação complexa)
4. ✅ `system-health` (monitoring)

### Média Prioridade
5. ⏳ `graylog-logs-export`
6. ⏳ `retry-failed-actions`
7. ⏳ `routing-agent`
8. ⏳ `fast-path`

### Baixa Prioridade
- Demais functions internas

---

## 📚 Exemplos Completos

Ver `docs/ACT-004-DISTRIBUTED-TRACING.md` para:
- ✅ Exemplo 1: Edge Function Simples
- ✅ Exemplo 2: Chamada Entre Functions
- ✅ Exemplo 3: Checkpoints para Performance

---

**Última Atualização**: 2025-11-13  
**Próxima Revisão**: Após migração de 50% das functions  
**Responsável**: DevOps Team
