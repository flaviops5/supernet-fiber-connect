# 🎯 FASE 0.5: TypeScript Zero-Any Backend (CRÍTICO)

**Status**: 🚧 Em Progresso  
**Iniciado**: 2025-11-05  
**Prioridade**: 🔴 CRÍTICA  
**Meta**: 100% Type Safety no Backend

---

## 🎯 Objetivo

Eliminar **TODOS** os usos de `any` type nas edge functions e arquivos compartilhados, substituindo por tipos específicos e type-safe. Isso é crítico para:

- ✅ Type safety em runtime
- ✅ Prevenção de bugs
- ✅ IntelliSense completo
- ✅ Refatorações seguras
- ✅ Qualidade de código profissional

---

## 📊 Levantamento Inicial

**Total de `any` encontrados**: 130+ ocorrências  
**Arquivos afetados**: 44 edge functions

### Distribuição por Categoria

| Categoria | Arquivos | `any` Count | Prioridade |
|-----------|----------|-------------|------------|
| **_shared/** | 9 | ~25 | 🔴 CRÍTICA |
| **Agentes** | 8 | ~30 | 🟡 Alta |
| **IXC Integration** | 12 | ~40 | 🟡 Alta |
| **Utilitários** | 15 | ~35 | 🟢 Média |

---

## 🎯 FASE 0.5.1: Arquivos Compartilhados (_shared/)

**Prioridade**: 🔴 CRÍTICA  
**Motivo**: Esses arquivos afetam múltiplas functions

### 1. ⏳ `_shared/log-sanitizer.ts` (5 any)

**Ocorrências**:
```typescript
// Linha 36
export function sanitizeForLog(obj: any, depth = 0): any { ... }

// Linhas 86, 92, 98, 115
info: (message: string, data?: any) => { ... }
warn: (message: string, data?: any) => { ... }
error: (message: string, error?: any) => { ... }
ixcData: (data: any) => { ... }
```

**Solução Proposta**:
```typescript
// Usar JsonValue do types.ts
import { JsonValue, JsonObject } from './types.ts';

export function sanitizeForLog(obj: JsonValue, depth = 0): JsonValue { ... }

// Usar tipos específicos para callbacks
info: (message: string, data?: JsonObject) => void;
warn: (message: string, data?: JsonObject) => void;
error: (message: string, error?: Error | unknown) => void;
ixcData: (data: JsonValue) => void;
```

### 2. ⏳ `_shared/geo.ts` (6 any)

**Ocorrências**:
```typescript
// Linhas 28-29, 106-107, 141
supabaseAdmin: any,
ctx: { conversation_id: string; flowState?: any },
withGeo(detalhes: Record<string, any>, flowState: any): Record<string, any>
```

**Solução Proposta**:
```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { JsonObject } from './types.ts';

interface FlowContext {
  conversation_id: string;
  flowState?: JsonObject;
}

function withGeo(
  detalhes: JsonObject, 
  flowState: JsonObject | null
): JsonObject { ... }
```

### 3. ⏳ `_shared/ixc-client.ts` (1 any)

**Ocorrências**:
```typescript
// Linha 98
body?: any,
```

**Solução Proposta**:
```typescript
import { JsonValue } from './types.ts';

body?: JsonValue,
```

### 4. ⏳ `_shared/aging.ts` (1 any)

**Ocorrências**:
```typescript
// Linha 8
export function markAgingEvent(supabaseAdmin: any, { ... }
```

**Solução Proposta**:
```typescript
import { SupabaseClient } from '@supabase/supabase-js';

export function markAgingEvent(
  supabaseAdmin: SupabaseClient,
  params: { ... }
)
```

### 5. ⏳ `_shared/flow-state.ts` (2 any)

**Ocorrências**:
```typescript
// Linhas 40-41
supabaseAdmin: any,
ctx: { conversation_id: string; flowState?: any },
```

**Solução Proposta**:
```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { JsonObject } from './types.ts';

interface FlowContext {
  conversation_id: string;
  flowState?: JsonObject;
}

function updateFlowState(
  supabaseAdmin: SupabaseClient,
  ctx: FlowContext
)
```

### 6. ⏳ `_shared/base-handler.ts` (1 any)

**Ocorrências**:
```typescript
// Linha 168
} catch (error: any) {
```

**Solução Proposta**:
```typescript
} catch (error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  // ...
}
```

### 7. ⏳ `_shared/replies.ts` (2 any)

**Ocorrências**:
```typescript
// Linhas 32-33
supabaseAdmin: any,
ctx: { conversation_id: string; flowState?: any } | string,
```

**Solução Proposta**:
```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { JsonObject } from './types.ts';

type ReplyContext = 
  | { conversation_id: string; flowState?: JsonObject }
  | string;

function sendReply(
  supabaseAdmin: SupabaseClient,
  ctx: ReplyContext
)
```

### 8. ⏳ `_shared/retests.ts` (1 any)

**Ocorrências**:
```typescript
// Linha 9
supabaseAdmin: any,
```

**Solução Proposta**:
```typescript
import { SupabaseClient } from '@supabase/supabase-js';

function logRetest(supabaseAdmin: SupabaseClient, ...)
```

### 9. ⏳ `_shared/onu-tracker.ts` (1 any)

**Ocorrências**:
```typescript
// Linha 8
export function trackOnuSnapshot(supabaseAdmin: any, {
```

**Solução Proposta**:
```typescript
import { SupabaseClient } from '@supabase/supabase-js';

export function trackOnuSnapshot(
  supabaseAdmin: SupabaseClient,
  params: { ... }
)
```

---

## 🎯 FASE 0.5.2: Agentes (Alta Prioridade)

### Agentes com `any`

1. ⏳ `logistics-agent/index.ts` (2 any)
2. ⏳ `atlas-analyzer/index.ts` (1 any)
3. ⏳ Outros agentes (verificar)

---

## 🎯 FASE 0.5.3: IXC Integration

### Functions IXC com `any`

1. ⏳ `ixc-integration/index.ts` (4 any)
2. ⏳ `ixc-proxy/index.ts` (2 any)
3. ⏳ `ixc-list-contracts/index.ts` (2 any)
4. ⏳ `ixc-list-plans/index.ts` (2 any)
5. ⏳ `ixc-sync-plans/index.ts` (5 any)
6. ⏳ `ixc-revenue-stats/index.ts` (1 any)
7. ⏳ `ixc-evolution-proxy/index.ts` (1 any)

---

## 📋 Checklist de Migração (Por Arquivo)

Para cada arquivo migrado:

- [ ] Identificar todas as ocorrências de `any`
- [ ] Importar tipos necessários (`JsonValue`, `JsonObject`, `SupabaseClient`)
- [ ] Substituir `any` por tipos específicos
- [ ] Criar interfaces/types quando necessário
- [ ] Adicionar type guards se necessário
- [ ] Testar function após migração
- [ ] Atualizar este documento
- [ ] Commit com mensagem: `refactor: eliminate any types in [file-name]`

---

## 🛠️ Tipos Disponíveis

### Do `_shared/types.ts`
```typescript
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];
```

### Do Supabase
```typescript
import { SupabaseClient } from '@supabase/supabase-js';
```

### Para Errors
```typescript
// ❌ RUIM
catch (error: any) {
  console.error(error.message);
}

// ✅ BOM
catch (error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error("Operation failed", err);
}
```

---

## 📊 Progresso Fase 0.5

| Fase | Arquivos | any Eliminados | Status |
|------|----------|----------------|--------|
| **0.5.1: _shared/** | 3/9 | 7/25 | 🚧 28% |
| **0.5.2: Agentes** | 0/8 | 0/30 | ⏸️ Aguardando |
| **0.5.3: IXC** | 0/12 | 0/40 | ⏸️ Aguardando |
| **0.5.4: Utilitários** | 0/15 | 0/35 | ⏸️ Aguardando |
| **TOTAL** | 3/44 | 7/130 | 🚧 5% |

### ✅ Arquivos _shared/ Migrados

1. ✅ **log-sanitizer.ts** (5/5 any eliminados)
   - `sanitizeForLog(obj: any)` → `sanitizeForLog(obj: JsonValue)`
   - `info/warn(data?: any)` → `info/warn(data?: JsonValue)`
   - `error(error?: any)` → `error(error?: Error | unknown)`
   - `ixcData(data: any)` → `ixcData(data: JsonValue)`

2. ✅ **ixc-client.ts** (2/2 any eliminados)
   - `body?: any` → `body?: JsonValue`
   - `Promise<any>` → `Promise<JsonValue>`

3. ✅ **base-handler.ts** (1/1 any eliminado)
   - `catch (error: any)` → `catch (error: unknown)`

---

## 🎯 Metas

- **Meta Fase 0.5.1**: Eliminar 100% dos `any` em _shared/ até 2025-11-06
- **Meta Fase 0.5.2**: Eliminar 100% dos `any` nos agentes até 2025-11-07
- **Meta Fase 0.5.3**: Eliminar 100% dos `any` em IXC até 2025-11-08
- **Meta Final**: 100% Zero-Any Backend até 2025-11-10

---

## 🏆 Benefícios Esperados

### Type Safety
- ✅ Erros de tipo detectados em build time
- ✅ IntelliSense completo e preciso
- ✅ Refatorações seguras

### Qualidade de Código
- ✅ Código mais profissional
- ✅ Manutenção facilitada
- ✅ Documentação via tipos

### Performance de Desenvolvimento
- ✅ Autocompletar funciona perfeitamente
- ✅ Menos bugs em produção
- ✅ Debugging mais rápido

---

## 📚 Documentação Relacionada

- [types.ts](../supabase/functions/_shared/types.ts) - Tipos base
- [ixc-types.ts](../supabase/functions/_shared/ixc-types.ts) - Tipos IXC
- [agent-types.ts](../supabase/functions/_shared/agent-types.ts) - Tipos de agentes

---

**Próxima Ação**: Iniciar migração de `_shared/log-sanitizer.ts`
