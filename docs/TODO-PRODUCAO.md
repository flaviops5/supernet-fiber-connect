# 📋 TODO para Produção - Sistema Completo

**Data de criação**: 2025-10-09  
**Status**: Em andamento

---

## ✅ CONCLUÍDO

### 1. Agent Presence - Erro de Duplicate Key
- [x] **Problema**: Erro `duplicate key value violates unique constraint "agent_presence_user_id_key"`
- [x] **Causa**: Upsert sem especificar constraint `onConflict`
- [x] **Solução**: Adicionado `onConflict: 'user_id'` no upsert
- [x] **Arquivo**: `src/pages/Atendimento.tsx` (linhas 25-35)
- [x] **Data**: 2025-10-09

### 2. Circuit Breaker - Reset Manual
- [x] **Problema**: Circuit breaker aberto bloqueando todas as chamadas IXC
- [x] **Solução**: Adicionada função `resetCircuitBreaker()` para reset manual
- [x] **Arquivos**: 
  - `supabase/functions/_shared/ixc-client.ts` (função de reset)
  - `supabase/functions/reset-circuit-breaker/index.ts` (edge function)
- [x] **Como usar**: 
  ```bash
  # Via curl (substituir TOKEN pelo Bearer token do admin)
  curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/reset-circuit-breaker \
    -H "Authorization: Bearer TOKEN"
  ```
- [x] **Data**: 2025-10-09

---

## 🔴 CRÍTICO - FAZER ANTES DE PRODUÇÃO

### 3. WhatsApp Integration - Evolution API
- [ ] **Problema**: Instância "SDR2" não existe na Evolution API
- [ ] **Status**: Todos os envios de WhatsApp retornam 404
- [ ] **Ações necessárias**:
  - [ ] Criar instância "SDR2" na Evolution API OU
  - [ ] Atualizar nome da instância no código (verificar qual instância está ativa)
  - [ ] Testar envio de mensagem via `/admin/whatsapp-test`
- [ ] **Arquivos envolvidos**: 
  - `supabase/functions/send-whatsapp-message/index.ts`
  - `src/components/WhatsAppTester.tsx`

### 4. Circuit Breaker - Causa Raiz Identificada ✅
- [x] **Problema**: Circuit breaker aberto por sobrecarga de requisições
- [x] **Causa Raiz Diagnosticada**: 
  - `detect-mass-outage` fazia até **1000 requisições paralelas** ao IXC
  - Concorrência de 10 requisições simultâneas sobrecarregava o servidor
  - Circuit Breaker estava **correto** em abrir para proteger o IXC
- [x] **Correções Aplicadas**:
  - ✅ Reduzida concorrência de 10→3 requisições (-70%)
  - ✅ Aumentado backoff inicial de 1s→2s
  - ✅ Aumentado backoff máximo de 10s→15s
  - ✅ Adicionado delay de 3s entre chunks
- [x] **Trade-off**: Detecção mais lenta (8-10 min vs 30s) mas sistema estável
- [x] **Documentação**: Ver `docs/CAUSA-RAIZ-CIRCUIT-BREAKER.md`
- [ ] **Próxima Iteração (Otimização)**:
  - [ ] Implementar cache de dados PON (15-30 min)
  - [ ] Verificar se IXC suporta batch queries
  - [ ] Considerar processamento background com fila

---

## 🟡 IMPORTANTE - PRÓXIMOS DIAS

### 5. Sistema de Alertas
- [ ] **Implementar notificações em tempo real**:
  - [ ] Alertas por email quando circuit breaker abrir
  - [ ] Notificação de falhas críticas no DLQ
  - [ ] Dashboard de health check visível
- [ ] **Ferramentas**: Usar `alert_config` e `alert_history` já existentes

### 6. Retry Automático - DLQ
- [ ] **Configurar processamento da Dead Letter Queue**:
  - [ ] Verificar se cron job está ativo
  - [ ] Testar retry de ações falhadas
  - [ ] Monitorar taxa de sucesso dos retries

### 7. Documentação Operacional
- [ ] **Criar guias para operadores**:
  - [ ] Como identificar e resolver problemas comuns
  - [ ] Procedimentos de escalação
  - [ ] Guia de uso do dashboard de métricas
- [ ] **Arquivo**: Atualizar `docs/operational-guide.md`

### 8. Backup Automático
- [ ] **Configurar backups do banco de dados**:
  - [ ] Backup diário automático
  - [ ] Retenção de 30 dias
  - [ ] Teste de restore

### 9. Logs Estruturados
- [ ] **Melhorar logging em todas as edge functions**:
  - [ ] Formato consistente
  - [ ] Níveis apropriados (info, warn, error)
  - [ ] Context tracking (request_id, user_id)

---

## 🟢 MELHORIAS PÓS-LANÇAMENTO

### 10. Otimização de Performance
- [ ] **Identificar queries lentas**:
  - [ ] Adicionar índices onde necessário
  - [ ] Otimizar queries N+1
  - [ ] Implementar paginação em listas grandes

### 11. Cache Redis
- [ ] **Implementar cache distribuído**:
  - [ ] Cache de consultas IXC frequentes
  - [ ] Session storage
  - [ ] Rate limiting distribuído

### 12. Rate Limiting Granular
- [ ] **Melhorar controle de taxa**:
  - [ ] Limites por endpoint
  - [ ] Limites por usuário/role
  - [ ] Limites por IP

### 13. Dashboard de Métricas de Negócio
- [ ] **KPIs visuais**:
  - [ ] Tempo médio de atendimento
  - [ ] Taxa de conversão
  - [ ] NPS em tempo real
  - [ ] Receita projetada vs real

---

## 📊 CHECKLIST FINAL PRÉ-PRODUÇÃO

Antes de ir para produção, verificar:

- [x] ✅ Problema 1: Agent Presence corrigido
- [ ] ❌ Problema 2: Evolution API configurada
- [x] ✅ Problema 3: Circuit Breaker com reset manual
- [ ] ❌ RLS Policies revisadas e testadas
- [ ] ❌ Secrets configurados e validados
- [ ] ❌ Edge Functions todas funcionando
- [ ] ❌ Testes de ponta a ponta executados
- [ ] ❌ Health check endpoint validado
- [ ] ❌ Documentação de operação completa
- [ ] ❌ Plano de rollback definido
- [ ] ❌ Monitoramento e alertas ativos

---

## 📞 CONTATOS DE EMERGÊNCIA

**Para suporte técnico urgente:**
- Lovable Discord: https://discord.com/channels/1119885301872070706/1280461670979993613
- Supabase Dashboard: https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp

**Endpoints importantes:**
- Health Check: `https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health`
- Métricas: `/system-metrics` (no app)
- Logs Edge Functions: https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions

---

## 📝 NOTAS

- Este documento deve ser atualizado sempre que um item for concluído
- Priorizar itens CRÍTICOS antes de qualquer deploy em produção
- Revisar semanalmente durante desenvolvimento
- Após produção, migrar itens concluídos para documentação permanente
