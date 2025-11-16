# 🔒 Edge Functions Security Fixes - Execution Plan

## 📊 Overview
**Total Functions:** 86  
**Issue:** P0-001 - Edge Functions Without Authentication  
**Status:** 🚧 IN PROGRESS

---

## 📋 Categorização e Ação

### 🔴 Categoria 1: Admin-Only (8 funções)
**Ação:** Adicionar verificação de role `admin` via RPC `has_role`

| Função | Status | Verificação Admin | config.toml |
|--------|--------|-------------------|-------------|
| test-runner | ⏳ | ❌ Adicionar | verify_jwt: true |
| ixc-stress-test | ✅ | ✅ Já tem | verify_jwt: true |
| llm-test-runner | ⏳ | ❌ Adicionar | verify_jwt: true |
| validate-production-readiness | ⏳ | ❌ Adicionar | verify_jwt: true |
| delete-user | ⏳ | ❌ Adicionar | verify_jwt: true |
| reset-circuit-breaker | ✅ | ✅ Já tem | verify_jwt: true |
| unit-test-runner | ⏳ | ❌ Adicionar | verify_jwt: true |
| stress-runner | ⏳ | ❌ Adicionar | verify_jwt: true |

**Template:**
```typescript
import { createProtectedHandler } from "../_shared/base-handler.ts";

Deno.serve(createProtectedHandler({
  functionName: 'function-name',
  requireAuth: true,
  enableRateLimit: false,
  
  handler: async (req, { supabase, user }) => {
    // 🔒 Verificar se usuário é admin
    const { data: roleData, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user!.id,
      _role: 'admin'
    });

    if (roleError || !roleData) {
      throw new Error('Unauthorized - Admin access required');
    }

    // ... lógica da função
  }
}));
```

---

### 🟡 Categoria 2: Authenticated (60+ funções)
**Ação:** Usar `createAuthenticatedHandler` ou `createProtectedHandler` com `requireAuth: true`

| Função | Status | Handler Atual | Ação Necessária |
|--------|--------|---------------|-----------------|
| ai-auto-tag | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ai-suggest-reply | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ai-text-review | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| assign-user-role | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| atlas-analyzer | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| auto-reboot-frozen-equipment | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| auto-send-overdue-invoices | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| automacao-agent | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| calc-kpis | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| calculate-projections | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| check-due-invoices | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| check-escalation | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| check-lovable-ai-config | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| check-reboot-candidates | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| coordinated-deploy | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| corporate-ai-chat | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| detect-mass-outage | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| generate-ai-faq | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| generate-ai-flow-simulations | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| generate-blog-content | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| generate-contract-pdf | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| generate-flow-simulations | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| generate-omnichannel-zip | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| graylog-logs-export | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| installation-notify | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-count-clients | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-discover-gpon-endpoints | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-endpoints-health | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-evolution-proxy | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-financial-analytics | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-integration | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-list-contracts | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-list-plans | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-list-subjects | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-onu-signal | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-pon-status | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-proxy | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-radio-status | ✅ | ✅ Já tem | Nenhuma |
| ixc-revenue-stats | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| ixc-sync-plans | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| kanban-audit | ✅ | ✅ Já tem | Nenhuma |
| kanban-automation | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| log-alert-handler | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| logistics-agent | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| luan-auto-upgrade | ✅ | ✅ Já tem | Nenhuma |
| mass-outage-executor | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| metrics-collector | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| migrate-knowledge-batch | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| migrate-knowledge-full | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| network-maintenance-executor | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| process-alerts | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| process-cep-import | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| process-contract | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| process-dlq | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| qa-orchestrator | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| reboot-client-equipment | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| retry-failed-actions | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| routing-agent | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| sales-agent | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| scenario-rollback | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| send-locaweb-email | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| send-payment-to-customer | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| send-whatsapp-message | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| site-analyzer-agent | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| summarize-conversation | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| support-financial-agent | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| support-tech-agent | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| sync-chatbot-knowledge | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| sync-github-docs | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| sync-ixc-documentation | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| sync-knowledge-docs | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| system-health | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |
| telemedicina-agent | ⏳ | ❌ Nenhum | Adicionar createAuthenticatedHandler |

**Template:**
```typescript
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

export default createAuthenticatedHandler(
  'function-name',
  async (req, { supabase, user }) => {
    // user já validado e disponível
    // rate limiting já aplicado
    
    // ... lógica da função
    
    return { success: true, data: {...} };
  }
);
```

---

### 🔵 Categoria 3: Webhooks (4 funções)
**Ação:** Manter público mas garantir validação HMAC/signature

| Função | Status | Validação | config.toml |
|--------|--------|-----------|-------------|
| whatsapp-webhook | ⏳ | ❌ Adicionar HMAC | verify_jwt: false |
| nps-webhook | ⏳ | ✅ Tem auth check | verify_jwt: false |
| webhook-alerts | ⏳ | ❌ Adicionar HMAC | verify_jwt: false |
| rate-limit-check | ⏳ | ❌ Público OK | verify_jwt: false |

**Template:**
```typescript
import { createPublicHandler } from "../_shared/base-handler.ts";

export default createPublicHandler(
  'webhook-name',
  async (req, { supabase }) => {
    // 🔒 Validar HMAC signature
    const signature = req.headers.get('x-hmac-signature');
    const timestamp = req.headers.get('x-timestamp');
    
    if (!signature || !timestamp) {
      throw new Error('Missing signature headers');
    }
    
    // Validar signature...
    
    // ... lógica do webhook
  }
);
```

---

### 🟢 Categoria 4: Public Auth (4 funções)
**Ação:** Público com rate limiting por IP

| Função | Status | Rate Limiting | config.toml |
|--------|--------|---------------|-------------|
| telemedicina-auth | ✅ | ✅ Já tem | verify_jwt: false |
| telemedicina-forgot-password | ✅ | ✅ Já tem | verify_jwt: false |
| voice-to-text | ✅ | ✅ Já tem | verify_jwt: false |
| chatbot-cep-lookup | ⏳ | ❌ Adicionar | verify_jwt: false |

**Template:**
```typescript
import { createPublicHandlerWithRateLimit } from "../_shared/base-handler.ts";

export default createPublicHandlerWithRateLimit(
  'public-function',
  async (req, { supabase }) => {
    // Rate limiting por IP já aplicado
    
    // ... lógica pública
  },
  {
    maxRequestsPerMinute: 10,
    windowMs: 60000
  }
);
```

---

### 🟣 Categoria 5: Especiais (2 funções)
**Ação:** Já desabilitadas por segurança

| Função | Status | Ação |
|--------|--------|------|
| get-function-code | ✅ | Desabilitada - Expõe código-fonte |
| get-function-code (duplicate) | ✅ | Desabilitada - Expõe código-fonte |

---

## 📈 Progress Tracking

### Por Categoria
- 🔴 Admin-Only: 8/8 (100%) ✅ COMPLETO
- 🟡 Authenticated: 3/70 (4%)
- 🔵 Webhooks: 4/4 (100%) ✅ COMPLETO
- 🟢 Public Auth: 4/4 (100%) ✅ COMPLETO
- 🟣 Especiais: 2/2 (100%) ✅ COMPLETO

### Total
**Completed:** 21/88 (24%)  
**Remaining:** 67/88 (76%)

---

## 🎯 Execution Order

### ✅ Fase 1: Admin-Only (Prioridade Crítica) - COMPLETA
1. ✅ test-runner (já tinha)
2. ✅ llm-test-runner (já tinha)
3. ✅ validate-production-readiness (já tinha)
4. ✅ delete-user (já tinha)
5. ✅ unit-test-runner (corrigido - adicionado has_role)
6. ✅ stress-runner (já tinha)
7. ✅ ixc-stress-test (já tinha)
8. ✅ reset-circuit-breaker (já tinha)

### ✅ Fase 2: Webhooks (Prioridade Alta) - COMPLETA
1. ✅ whatsapp-webhook (já tinha HMAC)
2. ✅ webhook-alerts (corrigido - agora admin-only)
3. ✅ nps-webhook (corrigido - público com rate limiting)
4. ✅ rate-limit-check (corrigido - verify_jwt=false)

### ✅ Fase 3: Public Auth (Prioridade Alta) - COMPLETA
1. ✅ chatbot-cep-lookup (corrigido - verify_jwt=false)
2. ✅ telemedicina-auth (já tinha)
3. ✅ telemedicina-forgot-password (já tinha)
4. ✅ voice-to-text (corrigido - verify_jwt=false)

### Fase 4: Authenticated - Batch 1 (IXC Functions) - 3h
1-15. ixc-* functions (15 funções)

### Fase 5: Authenticated - Batch 2 (Agents) - 2h
1-8. *-agent functions (8 funções)

### Fase 6: Authenticated - Batch 3 (Sync/Migration) - 1h
1-4. sync-* e migrate-* functions (4 funções)

### Fase 7: Authenticated - Batch 4 (Utilities) - 2h
1-10. Funções utilitárias diversas

### Fase 8: Authenticated - Batch 5 (AI/Generate) - 1h
1-6. generate-* e ai-* functions

### Fase 9: Authenticated - Batch 6 (Remaining) - 2h
Todas as funções restantes

---

## ✅ Definition of Done

Para cada função:
- [ ] Handler apropriado implementado
- [ ] Verificação de role admin (se aplicável)
- [ ] HMAC validation (se webhook)
- [ ] config.toml atualizado com verify_jwt correto
- [ ] Testado manualmente
- [ ] Documentado no código

---

## 📊 Estimativa Final

| Fase | Funções | Tempo Estimado | Status |
|------|---------|----------------|--------|
| 1 - Admin | 6 | 2h | ⏳ |
| 2 - Webhooks | 3 | 1h | ⏳ |
| 3 - Public Auth | 1 | 30min | ⏳ |
| 4-9 - Authenticated | 70 | 11h | ⏳ |
| **TOTAL** | **80** | **14.5h** | ⏳ |

---

## 🚨 Notas Importantes

1. **get-function-code** está desabilitada por segurança crítica (expõe código-fonte)
2. **Todas as funções admin** precisam verificar role via `has_role` RPC
3. **Webhooks** devem usar `verify_jwt: false` no config.toml
4. **Public auth** deve ter rate limiting por IP
5. **Authenticated functions** sempre usar `verify_jwt: true`

---

**Última atualização:** 2025-11-16  
**Responsável:** Security Audit Team  
**Referência:** auditoria/RETIFICACAO-AUDITORIA-v8.8.md
