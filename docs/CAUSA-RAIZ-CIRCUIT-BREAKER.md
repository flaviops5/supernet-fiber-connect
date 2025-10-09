# 🔍 Análise da Causa Raiz - Circuit Breaker IXC

## ❌ Problema Identificado

O Circuit Breaker do IXC estava abrindo devido a **SOBRECARGA DE REQUISIÇÕES**, não erro de configuração.

### Diagnóstico Detalhado

**O que estava acontecendo:**
```
detect-mass-outage invocado
  ↓
500 clientes offline detectados
  ↓
Para cada cliente: 2 chamadas paralelas (dados + equipamento)
  ↓
1000 requisições em ~16 chunks de 10 simultâneos
  ↓
IXC sobrecarregado → algumas requisições falham
  ↓
Circuit Breaker detecta 5 falhas → OPEN por 60s
  ↓
Todas as próximas requisições rejeitadas instantaneamente
```

### ✅ Evidências

1. **ixc-proxy funcionando perfeitamente:**
   - Logs mostram: `✅ IXC Response: 200 (140ms)`
   - Sem erros de HTML/login/404

2. **Circuit Breaker fazendo seu trabalho:**
   - Logs: `Error: Circuit breaker OPEN - aguarde Xs`
   - Protegendo IXC de colapso total

3. **Volume excessivo:**
   - 10 requisições paralelas × 50 chunks = sobrecarga
   - IXC não aguenta essa carga

### 🔧 Correções Aplicadas

#### 1. Redução de Concorrência
```typescript
// ANTES:
const MAX_CONCURRENT_REQUESTS = 10;

// DEPOIS:
const MAX_CONCURRENT_REQUESTS = 3; // 70% de redução
```

#### 2. Aumento de Backoff
```typescript
// ANTES:
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 10000;

// DEPOIS:
const INITIAL_BACKOFF_MS = 2000; // +100%
const MAX_BACKOFF_MS = 15000; // +50%
```

#### 3. Delay Entre Chunks
```typescript
// NOVO:
const CHUNK_DELAY_MS = 3000; // 3 segundos entre chunks

if (chunkIndex > 0) {
  await delayWithJitter(CHUNK_DELAY_MS);
}
```

### 📊 Impacto Esperado

**ANTES:**
- 500 clientes = ~50 chunks de 10 requisições
- Tempo total: ~30 segundos
- Risco de sobrecarga: **ALTO** 🔴

**DEPOIS:**
- 500 clientes = ~167 chunks de 3 requisições
- Tempo total: ~8-10 minutos (com delays)
- Risco de sobrecarga: **BAIXO** 🟢

### ⚠️ Trade-offs

**Positivo:**
- ✅ Circuit Breaker não abre mais
- ✅ IXC permanece estável
- ✅ Menos falhas nas requisições

**Negativo:**
- ⏱️ Detecção de queda em massa mais lenta (8-10 min vs 30s)
- 📉 Throughput reduzido

### 🎯 Próximos Passos (Otimização Futura)

1. **Cache Inteligente:**
   - Cachear dados de PON/equipamento por 15-30 min
   - Reduzir requisições repetidas

2. **Batch Queries:**
   - Verificar se IXC suporta buscar múltiplos clientes de uma vez
   - Exemplo: `cliente_id IN (1,2,3,4,5)`

3. **Processamento Background:**
   - Usar fila (ex: pg_cron) para processar clientes aos poucos
   - Atualizar dashboard em tempo real via Realtime

4. **Circuit Breaker Adaptativo:**
   - Ajustar threshold baseado em horário (ex: mais flexível à noite)
   - Monitorar taxa de erro e adaptar automaticamente

### 📝 Conclusão

**O Circuit Breaker estava CORRETO**. O problema era o **volume de requisições**.

A solução não era desabilitar o Circuit Breaker, mas sim **respeitar os limites do IXC**.

---

**Data:** 2025-10-09  
**Status:** ✅ CORRIGIDO  
**Arquivo:** `supabase/functions/detect-mass-outage/index.ts`
