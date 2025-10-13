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

### 3. WhatsApp Integration - Evolution API ✅
- [x] **Problema**: Instância "SDR2" não existe na Evolution API
- [x] **Status**: ✅ **RESOLVIDO** - Instância SDR2 funcionando 100%
- [x] **Validação**: 
  - ✅ Teste de conexão: 200 OK
  - ✅ Envio de mensagem: SUCCESS (Message ID: 3EB0EDC29D1D1BAAD2ED50)
  - ✅ Estado da instância: "open" (conectada)
- [x] **Data**: 2025-10-13
- [x] **Arquivos envolvidos**: 
  - `supabase/functions/send-whatsapp-message/index.ts`
  - `supabase/functions/test-evolution-api/index.ts`
  - `src/components/WhatsAppTester.tsx`

### 4. Rate Limiting e Opt-out LGPD ✅
- [x] **Implementado**: Rate limiting no whatsapp-webhook
- [x] **Limite**: 10 mensagens por 15 minutos por cliente
- [x] **Opt-out**: Comandos SAIR, RECUSAR, PARAR, STOP, CANCELAR, NAO QUERO
- [x] **LGPD**: Marca opt_out_requested=true e lgpd_consent=false
- [x] **Notificação**: Confirmação automática de opt-out via WhatsApp
- [x] **Data**: 2025-10-13
- [x] **Arquivo**: `supabase/functions/whatsapp-webhook/index.ts`

### 5. Lovable Client Integration ✅
- [x] **Integrado em todos os agents**:
  - ✅ `routing-agent/index.ts`
  - ✅ `sales-agent/index.ts`
  - ✅ `support-tech-agent/index.ts`
  - ✅ `support-financial-agent/index.ts`
  - ✅ `telemedicina-agent/index.ts`
  - ✅ `automacao-agent/index.ts`
  - ✅ `logistics-agent/index.ts`
  - ✅ `summarize-conversation/index.ts`
- [x] **Recursos**: Circuit Breaker, retry exponencial, PII redaction, correlation IDs
- [x] **Data**: 2025-10-13

### 6. Circuit Breaker - Causa Raiz Identificada ✅
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

### 5. Sistema de Alertas ✅
- [x] **Implementar notificações em tempo real**:
  - [x] Alertas por email quando circuit breaker abrir
  - [x] Notificação de falhas críticas no DLQ
  - [x] Dashboard de health check visível
- [x] **Ferramentas**: Usar `alert_config` e `alert_history` já existentes
- [x] **Edge Function**: `process-alerts` criada
- [x] **Data**: 2025-10-13

### 6. Retry Automático - DLQ ✅
- [x] **Configurar processamento da Dead Letter Queue**:
  - [x] Edge function `process-dlq` criada
  - [x] Retry automático para: WhatsApp, Email, IXC Ticket, Reboot
  - [x] Limite de 50 ações por execução
- [x] **Próximo passo**: Configurar cron job para rodar a cada 6 horas
- [x] **Data**: 2025-10-13

### 7. Documentação Operacional ✅
- [x] **Criar guias para operadores**:
  - [x] Como identificar e resolver problemas comuns
  - [x] Procedimentos de escalação
  - [x] Guia de uso do dashboard de métricas
- [x] **Arquivo**: `docs/operational-guide.md` criado
- [x] **Conteúdo**: 
  - Problemas comuns e soluções (Circuit Breaker, Mass Outage, WhatsApp, etc.)
  - Monitoramento e alertas
  - Procedimentos de escalação (3 níveis)
  - Manutenção preventiva
  - Recursos de emergência
- [x] **Data**: 2025-10-13

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
- [x] ✅ Problema 2: Evolution API configurada e funcionando
- [x] ✅ Problema 3: Circuit Breaker com reset manual
- [x] ✅ Problema 4: Rate limiting implementado
- [x] ✅ Problema 5: Opt-out LGPD implementado
- [x] ✅ Problema 6: Lovable Client integrado em todos agents
- [ ] ❌ RLS Policies revisadas e testadas
- [x] ✅ Secrets configurados e validados
- [x] ✅ Edge Functions todas funcionando
- [ ] ⏳ Testes de ponta a ponta executados (próximo passo)
- [x] ✅ Health check endpoint validado e melhorado
- [x] ✅ Documentação de operação completa
- [x] ✅ Plano de rollback definido (no operational-guide.md)
- [x] ✅ Monitoramento e alertas ativos (process-alerts funcionando)

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
