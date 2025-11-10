# Plano de Refatoração do index.ts

## 🎯 Objetivo

Transformar index.ts de **4798 linhas monolíticas** para **~800 linhas de orquestração**, importando os 5 cenários migrados (A, B, C, D, E) mantendo 100% de compatibilidade.

---

## ✅ Status Atual

### Concluído
- ✅ Imports dos cenários adicionados (linhas 27-35)
- ✅ Interfaces criadas (`types/scenario-context.ts`)
- ✅ Detector criado (`detection/scenario-detector.ts`)
- ✅ 5 cenários migrados criados

### Pendente
- ⏳ Adicionar lógica de roteamento feature-flagged
- ⏳ Adaptar contextos entre formato antigo e novo
- ⏳ Testar em staging com 10% rollout
- ⏳ Remover código inline após validação

---

## 🚨 Desafio Principal

**Problema:** Os cenários migrados usam interfaces diferentes do código inline atual.

### Formato Atual (Inline)
```typescript
// Variáveis globais no handler
const { conversation_id, customer_cpf, message, ixc_client_id } = body;
const { data: currentConversation } = await supabase
  .from("conversations")
  .select("metadata")
  .eq("id", conversation_id)
  .single();

// Cenário A inline (linhas 1657-2682)
if (isCenarioA && continueFlowState) {
  // 1000+ linhas de código inline
}
```

### Formato Refatorado (Módulos)
```typescript
// Cenário A em scenario-a.ts
interface ScenarioAContext {
  conversation_id: string;
  ixc_client_id: string;
  customer_name: string;
  current_message: string;
  flow_state: any;
}

export async function handleScenarioA(
  supabase: SupabaseClient,
  logger: any,
  context: ScenarioAContext
): Promise<ScenarioAResult>
```

**Solução:** Criar função adaptadora que converte formato inline → refatorado.

---

## 📋 Estratégia de Implementação

### Fase 1: Preparação (✅ CONCLUÍDA)
1. ✅ Adicionar imports dos cenários migrados
2. ✅ Criar interfaces unificadas
3. ✅ Criar detector de cenários

### Fase 2: Função Adaptadora (PRÓXIMO PASSO)

Criar `buildScenarioContext()` que converte dados inline para o formato esperado pelos módulos:

```typescript
/**
 * Adapta contexto do formato inline para formato dos módulos refatorados
 */
function buildScenarioContext(
  scenario: ScenarioType,
  inlineData: {
    conversation_id: string;
    customer_name: string;
    customer_cpf?: string;
    ixc_client_id?: string;
    message: string;
    flowState: any;
    signal?: any;
    messageHistory: any[];
  }
): any {
  // Base context comum a todos os cenários
  const baseContext = {
    conversation_id: inlineData.conversation_id,
    customer_name: inlineData.customer_name,
    current_message: inlineData.message,
    flow_state: inlineData.flowState,
    signal_data: inlineData.signal,
    message_history: inlineData.messageHistory
  };

  // Adaptações específicas por cenário
  switch (scenario) {
    case 'A':
      return {
        ...baseContext,
        ixc_client_id: inlineData.ixc_client_id || inlineData.flowState?.ixc_client_id,
        waiting_step: inlineData.flowState?.waiting_step
      };
    
    case 'B':
      return {
        ...baseContext,
        ixc_client_id: inlineData.ixc_client_id,
        fast_path_eligible: true
      };
    
    // ... outros cenários
    
    default:
      return baseContext;
  }
}
```

### Fase 3: Roteamento Feature-Flagged

Adicionar logo após setup inicial (~linha 950, após mass outage check):

```typescript
// ==========================================
// REFACTORED SCENARIO ROUTER (Feature Flagged)
// ==========================================
const detectionResult = detectScenario(signal, flowState, massOutageActive);
const useRefactored = await shouldUseRefactoredScenario(
  supabase, 
  detectionResult.scenario, 
  conversation_id
);

if (useRefactored && detectionResult.scenario) {
  logger.info("🔄 Using REFACTORED scenario handler", {
    scenario: detectionResult.scenario,
    confidence: detectionResult.confidence,
    reason: detectionResult.reason
  });

  // Construir contexto adaptado
  const scenarioContext = buildScenarioContext(detectionResult.scenario, {
    conversation_id,
    customer_name,
    customer_cpf,
    ixc_client_id,
    message,
    flowState,
    signal,
    messageHistory
  });

  let result: any;

  // Roteamento switch/case
  switch (detectionResult.scenario) {
    case 'A':
      result = await handleScenarioA(supabase, logger, scenarioContext);
      break;
    case 'B':
      result = await handleScenarioB(supabase, logger, scenarioContext);
      break;
    case 'C':
      result = await handleScenarioC(scenarioContext, supabase, logger);
      break;
    case 'D':
      result = await handleScenarioD(scenarioContext, supabase, logger);
      break;
    case 'E':
      result = await handleScenarioE(scenarioContext, supabase, logger);
      break;
  }

  // Processar resultado unificado
  if (result.should_insert) {
    await supabase.from("conversation_messages").insert({
      conversation_id,
      sender_type: "agent",
      sender_name: "Luan Silva",
      content: result.message,
      ai_suggestion: false
    });
  }

  if (result.flow_updates) {
    await updateFlowState(supabase, { conversation_id, flowState }, result.flow_updates);
  }

  // Log comparativo A/B
  await supabase.from("registros_de_monitoramento").insert({
    acao: "refactored_scenario_used",
    fluxo: "support-tech",
    conversation_id,
    detalhes: {
      scenario: detectionResult.scenario,
      version: "refactored",
      resolved: result.resolved,
      escalated: result.escalate
    }
  });

  return textReply(result.message);
}

// ==========================================
// FALLBACK: Código Inline Original (Legacy)
// ==========================================
logger.info("🔄 Using INLINE scenario handler (legacy)", {
  conversation_id,
  useRefactored: false
});

// ... código inline existente continua aqui ...
```

### Fase 4: Feature Flag no Banco

Criar migration:

```sql
INSERT INTO feature_flags (flag_key, enabled, rollout_percentage, description)
VALUES (
  'refactored_scenarios',
  false,
  0,
  'Habilita cenários refatorados (A, B, C, D, E). Rollout gradual: 0% → 10% → 25% → 50% → 100%'
);
```

### Fase 5: Rollout Gradual

```
Semana 1: 10% → Monitorar 48h
Semana 2: 25% → Monitorar 48h
Semana 3: 50% → Monitorar 72h
Semana 4: 75% → Monitorar 72h
Semana 5: 100% → Monitorar 1 semana
```

**KPIs para validação em cada fase:**
- Taxa de erro < 2% (baseline)
- Tempo de resposta < +10% (baseline)
- Taxa de resolução ≥ 95% (baseline)
- Zero critical bugs

### Fase 6: Limpeza (Após 2 semanas 100% stable)

1. Remover código inline dos cenários (~3000 linhas)
2. Remover feature flags
3. Simplificar função adaptadora (se necessário)
4. Atualizar documentação

---

## 🎯 Próximos Passos Imediatos

1. ✅ **Criar função `buildScenarioContext()`** - Adaptador de contexto
2. ✅ **Adicionar roteamento feature-flagged** - Logo após mass outage check
3. ✅ **Criar migration de feature flag** - Na tabela feature_flags
4. ✅ **Testar em staging** - Com 10% rollout
5. ✅ **Monitorar KPIs** - Comparar refactored vs inline

---

## 📊 Redução de Complexidade

| Métrica | Antes | Depois | Redução |
|---------|-------|--------|---------|
| Linhas index.ts | 4798 | ~900 | 81% |
| Cenário A | 1000 linhas inline | Import + 10 linhas adaptador | 99% |
| Cenário B | 1080 linhas inline | Import + 10 linhas adaptador | 99% |
| Cenário C | 322 linhas inline | Import + 10 linhas adaptador | 97% |
| Cenário D | 160 linhas inline | Import + 10 linhas adaptador | 94% |
| Cenário E | 298 linhas inline | Import + 10 linhas adaptador | 97% |
| **TOTAL** | **2860 linhas cenários** | **50 linhas orquestração** | **98%** |

---

## 🔒 Garantias de Segurança

1. ✅ **Zero Breaking Changes** - Código inline continua funcionando como fallback
2. ✅ **Rollback Instantâneo** - Basta desabilitar feature flag
3. ✅ **A/B Testing** - Comparação automática de KPIs
4. ✅ **Rollout Gradual** - Blast radius limitado a X% do tráfego
5. ✅ **Monitoramento Contínuo** - Logs detalhados de ambas as versões

---

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Interfaces incompatíveis | Médio | Alto | Função adaptadora + testes unitários |
| Regressão funcional | Baixo | Alto | Feature flag + rollout gradual + A/B testing |
| Performance degradation | Baixo | Médio | Benchmarks + monitoramento |
| Bugs em edge cases | Médio | Médio | Testes E2E + canary deployment |

---

## 📝 Checklist de Validação

Antes de cada incremento de rollout:

- [ ] Taxa de erro < 2%
- [ ] Tempo médio de resposta < baseline + 10%
- [ ] Taxa de resolução ≥ baseline
- [ ] Zero critical bugs reportados
- [ ] Logs sem erros anômalos
- [ ] KPIs de cenários mantidos ou melhorados
- [ ] Feedback de atendentes (se aplicável)

---

## 🎉 Estado Final Esperado

```
supabase/functions/support-tech-agent/
├── index.ts (~900 linhas)
│   ├── Imports (50 linhas)
│   ├── Helpers compartilhados (200 linhas)
│   ├── Setup inicial (150 linhas)
│   ├── Roteamento refatorado (100 linhas) ← NOVO
│   ├── Processamento de resultado (50 linhas) ← NOVO
│   └── Handlers auxiliares (350 linhas)
├── types/
│   └── scenario-context.ts ✅
├── detection/
│   └── scenario-detector.ts ✅
├── scenarios/
│   ├── scenario-a.ts ✅ (650 linhas)
│   ├── scenario-b.ts ✅ (950 linhas)
│   ├── scenario-c.ts ✅ (600 linhas)
│   ├── scenario-d.ts ✅ (550 linhas)
│   └── scenario-e.ts ✅ (950 linhas)
└── services/ (existentes)
```

**Resultado:** 
- 4798 → 900 linhas no index.ts (81% redução)
- Código 100% modular e testável
- Rollout gradual seguro
- Zero downtime
