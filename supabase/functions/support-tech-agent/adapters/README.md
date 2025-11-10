# Context Adapter

Camada de adaptação entre código inline (monolítico) e cenários refatorados (modulares).

## 📋 Propósito

Permitir **rollout gradual feature-flagged** dos cenários refatorados sem quebrar a implementação inline existente.

### Problema Resolvido

Os cenários migrados usam interfaces diferentes do código inline:

```typescript
// ❌ INLINE (código atual)
const { conversation_id, message, ixc_client_id } = body;
// ... 3000 linhas de lógica inline ...

// ✅ REFATORADO (módulos)
interface ScenarioAContext {
  conversation_id: string;
  ixc_client_id: string;
  customer_name: string;
  current_message: string;
  // ... interface padronizada
}
```

**Solução:** `context-adapter.ts` converte automaticamente entre os formatos.

---

## 🎯 Uso Básico

```typescript
import { buildScenarioContext, adaptScenarioResult } from "./adapters/context-adapter.ts";
import { handleScenarioA } from "./scenarios/scenario-a.ts";

// 1. Preparar dados inline
const inlineData = {
  conversation_id,
  customer_name,
  ixc_client_id,
  message,
  flowState,
  signal,
  messageHistory
};

// 2. Converter para formato refatorado
const scenarioContext = buildScenarioContext('A', inlineData);

// 3. Executar cenário refatorado
const result = await handleScenarioA(supabase, logger, scenarioContext);

// 4. Adaptar resultado de volta para formato inline
const adapted = adaptScenarioResult('A', result);

// 5. Processar resultado
if (adapted.shouldInsertMessage) {
  await insertMessage(conversation_id, adapted.message);
}
```

---

## 🔧 API Reference

### `buildScenarioContext(scenario, data)`

Converte contexto inline → refatorado com roteamento automático.

**Parâmetros:**
- `scenario`: `'A' | 'B' | 'C' | 'D' | 'E'`
- `data`: `InlineContextData` (extraído do handler principal)

**Retorna:** Contexto adaptado específico para cada cenário

**Exemplo:**
```typescript
const contextA = buildScenarioContext('A', {
  conversation_id: "conv-123",
  customer_name: "João Silva",
  ixc_client_id: "12345",
  message: "Internet parou",
  flowState: { waiting_step: "a_check_energy" },
  signal: { tx: 0, rx: 0 },
  messageHistory: []
});
// Resultado: contexto formatado para handleScenarioA()
```

---

### `adaptScenarioResult(scenario, result)`

Converte resultado refatorado → inline para processamento transparente.

**Parâmetros:**
- `scenario`: `'A' | 'B' | 'C' | 'D' | 'E'`
- `result`: Objeto retornado por `handleScenario*()`

**Retorna:** `AdaptedResult`
```typescript
{
  message: string;
  shouldInsertMessage: boolean;
  flowUpdates?: Record<string, any>;
  shouldEscalate?: boolean;
  resolved?: boolean;
  ticketCreated?: boolean;
  ticketId?: string;
}
```

---

### `validateInlineContext(scenario, data)`

Valida se o contexto inline tem todos os dados necessários.

**Parâmetros:**
- `scenario`: `'A' | 'B' | 'C' | 'D' | 'E'`
- `data`: `InlineContextData`

**Retorna:**
```typescript
{
  valid: boolean;
  missing: string[]; // Campos ausentes
}
```

**Exemplo:**
```typescript
const validation = validateInlineContext('B', inlineData);
if (!validation.valid) {
  logger.error("Contexto inválido", { 
    missing: validation.missing 
  });
  // Fallback para código inline
}
```

---

## 🧪 Testes

Executar testes unitários:

```bash
cd supabase/functions/support-tech-agent/adapters
deno test context-adapter.test.ts
```

### Cobertura de Testes

- ✅ Conversão básica para todos os cenários (A, B, C, D, E)
- ✅ Fallbacks (ixc_client_id do flowState, etc.)
- ✅ Lógica de fast_path_eligible (Cenário B)
- ✅ Conversão camelCase (Cenários C, D, E)
- ✅ Status automático de sinal (crítico, bom)
- ✅ Roteamento automático
- ✅ Validação de contexto
- ✅ Adaptação de resultados
- ✅ Edge cases (valores string, arrays vazios, null)

**Output esperado:**
```
✅ Todos os testes do Context Adapter passaram!
```

---

## 📐 Diferenças de Interface por Cenário

### Cenário A
```typescript
// Inline → Refatorado
{
  conversation_id → conversation_id
  message → current_message
  ixc_client_id → ixc_client_id (com fallback do flowState)
  flowState.waiting_step → waiting_step
  signal → signal_data (conversão numérica garantida)
}
```

### Cenário B
```typescript
// Inline → Refatorado + Lógica Adicional
{
  conversation_id → conversation_id
  message → current_message
  ixc_client_id → ixc_client_id
  
  // Calculado automaticamente:
  fast_path_eligible: boolean (baseado em flags)
  reboot_attempts: number (do flowState)
}
```

### Cenários C, D, E
```typescript
// Inline (snake_case) → Refatorado (camelCase)
{
  conversation_id → conversationId
  ixc_client_id → ixcClientId
  customer_name → customerName
  message → currentMessage
  signal → signalData
  messageHistory → messageHistory
}
```

---

## 🔍 Debugging

### Ativar logs detalhados

```typescript
import { buildScenarioContext } from "./adapters/context-adapter.ts";

const context = buildScenarioContext('B', inlineData);

console.log("🔍 Context adaptado:", {
  scenario: 'B',
  fast_path_eligible: context.fast_path_eligible,
  reboot_attempts: context.reboot_attempts,
  has_signal: !!context.signal_data
});
```

### Comparar inline vs refatorado

```typescript
// Executar ambas as implementações lado a lado
const inlineResult = await executeInlineScenarioB();
const refactoredResult = await handleScenarioB(
  supabase, 
  logger, 
  buildScenarioBContext(inlineData)
);

console.log("📊 Comparação:", {
  inline: {
    message_length: inlineResult.length,
    flow_state: inlineResult.flowState
  },
  refactored: {
    message_length: refactoredResult.message.length,
    flow_updates: refactoredResult.flow_updates
  }
});
```

---

## ⚠️ Cuidados

### 1. **Sempre validar contexto antes de usar**

```typescript
const validation = validateInlineContext('A', inlineData);
if (!validation.valid) {
  logger.warn("Contexto inválido, usando código inline", {
    missing: validation.missing
  });
  // Fallback para código inline original
  return executeInlineScenarioA();
}
```

### 2. **Não misturar formatos**

```typescript
// ❌ ERRADO
const context = buildScenarioAContext(data);
context.conversationId = "abc"; // Cenário A usa conversation_id, não camelCase!

// ✅ CORRETO
const context = buildScenarioAContext(data);
// Usar como está, sem modificações manuais
```

### 3. **Conversão numérica de sinal**

```typescript
// O adaptador garante que tx/rx sejam números
const context = buildScenarioContext('D', {
  signal: { tx: "2.5", rx: "-30.0" } // Strings
});

console.log(typeof context.signalData.rx); // "number"
console.log(context.signalData.rx); // -30.0 (não "-30.0")
```

---

## 🚀 Roadmap

### Fase 1: Isolado (ATUAL)
- ✅ Função adaptadora criada
- ✅ Testes unitários completos
- ✅ Documentação

### Fase 2: Integração no index.ts
- ⏳ Adicionar roteamento feature-flagged
- ⏳ Deploy em staging com 10% rollout
- ⏳ Monitorar métricas A/B

### Fase 3: Rollout Completo
- ⏳ 10% → 25% → 50% → 75% → 100%
- ⏳ Validar KPIs em cada fase

### Fase 4: Limpeza
- ⏳ Remover código inline (~3000 linhas)
- ⏳ Simplificar adaptador (se possível)
- ⏳ Atualizar documentação final

---

## 📚 Referências

- [Plano de Refatoração](../../docs/INDEX-REFACTORING-PLAN.md)
- [Análise do Código Monolítico](../../docs/INTEGRATION-ANALYSIS.md)
- [Cenário A - Usage Guide](../../docs/SCENARIO-A-USAGE.md)
- [Cenário B - Usage Guide](../../docs/SCENARIO-B-USAGE.md)
- [Cenário C - Usage Guide](../../docs/SCENARIO-C-USAGE.md)
- [Cenário D - Usage Guide](../../docs/SCENARIO-D-USAGE.md)
- [Cenário E - Usage Guide](../../docs/SCENARIO-E-USAGE.md)
