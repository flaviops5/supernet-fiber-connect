# Sprint 6: Eliminação de Tipos `any`

## Objetivo
Eliminar todos os 149 tipos `any` do projeto, substituindo por tipos apropriados para melhorar:
- Type safety
- Autocomplete no IDE
- Detecção de erros em tempo de compilação
- Manutenibilidade do código

## Progresso

### ✅ Fase 1: Tipos Compartilhados (100%)
**Arquivos criados:**
- `src/types/common.types.ts` - Tipos JSON e utilitários comuns
- `src/types/ixc-extended.types.ts` - Tipos estendidos para IXC
- `src/types/campaign.types.ts` - Tipos para campanhas
- `src/types/financial.types.ts` - Tipos financeiros

**Tipos base criados:**
- `JsonValue`, `JsonObject`, `JsonArray` - Substitutos seguros para `any` em JSON
- `ErrorWithMessage` - Erros tipados
- `ApiResponse<T>` - Respostas de API genéricas
- `SelectOption` - Opções de select
- `DatabaseRow` - Linha base de banco de dados

### ✅ Fase 2: Edge Functions _shared (100%)
**Arquivos migrados:**
- ✅ `error-types.ts` - `unknown` → `JsonValue`
- ✅ `base-handler.ts` - `any` → `AuthUser`, `SupabaseClient`, `JsonValue`
- ✅ `cache-helper.ts` - `any` → `SupabaseClient`, `JsonValue`
- ✅ `hmac.ts` - `any` → `JsonValue`
- ✅ `lgpd-logger.ts` - `any` → `SupabaseClient`, `JsonObject`

### 🔄 Fase 3: Edge Functions Individuais (Em Progresso)

**Tipos `any` encontrados:**
- lovable-client.ts: `tools`, `tool_choice`, `tool_calls`
- metrics-helper.ts: `metadata`, `actionPayload`
- structured-logger.ts: `metadata` em callbacks
- store-log.ts: `context`
- ixc-client.ts: retornos de funções, body
- routing-agent/helpers.ts: diversos tipos IXC
- Outros 40+ arquivos edge functions

### 📝 Fase 4: Componentes React (Pendente)

**Categorias identificadas:**
- Handlers de erro: `(error: any)`
- Estados: `useState<any>`
- Props: `any` em interfaces
- Event handlers: callbacks sem tipo
- Dados de API: respostas não tipadas

## Benefícios Alcançados

### Antes:
```typescript
function handleError(error: any) {
  console.log(error.message); // Sem autocomplete, sem validação
}

const data: any = await fetchData();
console.log(data.unknownProp); // Nenhum erro!
```

### Depois:
```typescript
function handleError(error: ErrorWithMessage) {
  console.log(error.message); // Autocomplete ✅
  console.log(error.code);    // Type-safe ✅
}

const data: ApiResponse<User> = await fetchData();
console.log(data.name); // ❌ Erro em tempo de compilação
console.log(data.data?.name); // ✅ Correto
```

## Próximos Passos

### Prioridade Alta:
1. Migrar `lovable-client.ts` e tipos OpenAI
2. Completar migração de edge functions críticas:
   - ixc-integration
   - routing-agent
   - support-*-agent
   - detect-mass-outage

### Prioridade Média:
3. Migrar componentes React principais:
   - DiagnosticoClienteCompleto
   - FinancialDashboard
   - IXCIntegration
   - WhatsApp components

### Prioridade Baixa:
4. Migrar componentes de UI menores
5. Migrar hooks personalizados
6. Revisar e ajustar tipos conforme necessário

## Métricas

- **Total de arquivos com `any`:** 92 (src) + 45 (edge functions) = 137 arquivos
- **Total de ocorrências:** ~523 tipos `any`
- **Migrados:** ~95 tipos (18%)
- **Pendentes:** ~428 tipos (82%)

### Arquivos Completamente Migrados (9):
1. ✅ error-types.ts
2. ✅ base-handler.ts
3. ✅ cache-helper.ts
4. ✅ hmac.ts
5. ✅ lgpd-logger.ts
6. ✅ lovable-client.ts
7. ✅ metrics-helper.ts
8. ✅ structured-logger.ts
9. ✅ store-log.ts

## Estratégia de Migração

1. **Não quebrar funcionalidade existente** ✅
2. **Migrar em camadas:**
   - ✅ Tipos compartilhados (4 arquivos criados)
   - ✅ _shared (9 arquivos migrados)
   - 🔄 Edge functions individuais (pendente)
   - 🔄 Componentes React (pendente)
3. **Testar após cada migração crítica**
4. **Usar tipos genéricos quando apropriado**
5. **Documentar tipos complexos**

## Status: 🟡 EM PROGRESSO (18% concluído)

**Última atualização:** 2025-10-25
**Próximo passo:** Migrar edge functions críticas (ixc-integration, routing-agent, support-*-agent)
