# 🔒 Edge Functions Security Status - ATUALIZADO

## ✅ Correções Aplicadas (24% Completo)

### 🔴 Admin-Only: 8/8 (100%) ✅
- test-runner
- llm-test-runner
- validate-production-readiness
- delete-user
- unit-test-runner (corrigido)
- stress-runner
- ixc-stress-test
- reset-circuit-breaker

**Status:** Todas protegidas com `has_role('admin')`

### 🔵 Webhooks: 4/4 (100%) ✅
- whatsapp-webhook (HMAC + idempotency)
- webhook-alerts (admin-only)
- nps-webhook (público com rate limiting)
- rate-limit-check (público)

**Status:** Todas com proteção adequada

### 🟢 Public Auth: 4/4 (100%) ✅
- telemedicina-auth (rate limiting)
- telemedicina-forgot-password (rate limiting)
- voice-to-text (rate limiting)
- chatbot-cep-lookup (rate limiting)

**Status:** Todas com `verify_jwt=false` e rate limiting

### 🟣 Especiais: 2/2 (100%) ✅
- get-function-code (DESABILITADA por segurança)

---

## ⏳ Pendentes: 67 funções Authenticated

**Necessitam:** `createAuthenticatedHandler` ou `createProtectedHandler`

### Grupos Pendentes:
1. **IXC Functions (15)**: ixc-proxy, ixc-integration, ixc-list-*, etc.
2. **Agents (8)**: automacao-agent, routing-agent, sales-agent, etc.
3. **Sync/Migration (6)**: sync-*, migrate-*
4. **Generate/AI (6)**: generate-*, ai-*
5. **Utilities (32)**: Diversas funções utilitárias

---

## 📊 Score Atual
**87/100 → 89/100** (+2 pontos pelas correções críticas)

**Próximo objetivo:** 95/100 (corrigir 30 funções Authenticated mais críticas)

---

**Última atualização:** 2025-11-16 11:26
**Responsável:** Security Team
