# 🔍 Levantamento Completo Pré-Produção - 2025-10-09

## 📊 Status Geral do Sistema

### Score de Prontidão: 65/100

| Categoria | Score | Status | Observações |
|-----------|-------|--------|-------------|
| **Backend** | 85/100 | 🟡 Bom | Circuit breaker corrigido, proxy funcional |
| **Frontend** | 90/100 | ✅ Excelente | UI completa, responsiva |
| **Integrações** | 40/100 | 🔴 Crítico | WhatsApp 404, IXC parcial |
| **Segurança** | 95/100 | ✅ Excelente | RLS, HMAC, rate limit OK |
| **Monitoramento** | 70/100 | 🟡 Bom | Métricas OK, alertas faltam |
| **Documentação** | 80/100 | 🟡 Bom | Técnica OK, operacional precisa revisão |

---

## ✅ O QUE ESTÁ FUNCIONANDO (BEM!)

### 1. Backend & Database ✅
- ✅ Supabase conectado e estável
- ✅ RLS policies configuradas corretamente
- ✅ Edge Functions deployadas (30+ funções)
- ✅ Circuit Breaker implementado e otimizado
- ✅ IXC Proxy centralizado funcionando
- ✅ Cache de 30s em GET requests
- ✅ Retry com backoff exponencial

### 2. Agentes IA ✅
- ✅ Cloé (routing) - Validação CPF, roteamento inteligente
- ✅ Luan (tech) - Suporte técnico com acesso IXC
- ✅ Júlia (financial) - Negociação de débitos
- ✅ Vicente (sales) - Vendas com agendamento
- ✅ Sistema de tool calling funcionando
- ✅ Context management adequado

### 3. Segurança ✅
- ✅ HMAC entre edge functions (SHA-256)
- ✅ Rate limiting (10 msg/min por CPF)
- ✅ RLS policies em todas tabelas sensíveis
- ✅ Secrets gerenciados pelo Supabase
- ✅ Input validation (zod schemas)
- ✅ Sanitização de dados

### 4. Funcionalidades Frontend ✅
- ✅ Dashboard admin completo
- ✅ Gestão de campanhas
- ✅ NPSTool com follow-up
- ✅ Gestão de documentos
- ✅ Chat omnichannel (simulação)
- ✅ Gestão de contratos
- ✅ Blog integrado
- ✅ Sistema de FAQs
- ✅ Mapa de cobertura interativo

---

## 🔴 PROBLEMAS CRÍTICOS (BLOQUEADORES)

### 1. WhatsApp - Evolution API (URGENTE)
**Impacto**: 🔴 ALTO - Sistema não envia mensagens reais

**Problema**:
```
Instância "SDR2" não existe na Evolution API
Todos os envios retornam: 404 Not Found
```

**Evidência**:
```typescript
// supabase/functions/send-whatsapp-message/index.ts:22
const instanceId = 'SDR2'; // ❌ Não existe!
```

**Ações Necessárias**:
1. [ ] Descobrir qual instância está ativa na Evolution API
2. [ ] Atualizar `instanceId` em `send-whatsapp-message/index.ts`
3. [ ] Testar envio via `/admin/whatsapp-test`
4. [ ] Validar recebimento de mensagens
5. [ ] Verificar se webhook está configurado corretamente

**Arquivos Impactados**:
- `supabase/functions/send-whatsapp-message/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- `src/components/WhatsAppTester.tsx`

**Tempo Estimado**: 30 minutos

---

### 2. Validação de Credenciais IXC
**Impacto**: 🟡 MÉDIO - Pode causar falhas intermitentes

**Problema**:
- URL base do IXC não foi validada em produção
- Credenciais podem estar incorretas/expiradas
- Sem teste end-to-end real

**Ações Necessárias**:
1. [ ] Validar `IXC_API_BASE_URL` acessível
2. [ ] Testar autenticação com `IXC_API_USERNAME/PASSWORD`
3. [ ] Fazer teste de cada endpoint crítico:
   - `/webservice/v1/cliente` (busca)
   - `/webservice/v1/su_oss_chamado` (criar ticket)
   - `/webservice/v1/fn_areceber` (buscar faturas)
   - `/webservice/v1/radusuarios` (status conexão)

**Como Testar**:
```bash
# Via edge function test-ixc-connection
curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/test-ixc-connection
```

**Tempo Estimado**: 1 hora

---

### 3. Alertas Não Implementados
**Impacto**: 🟡 MÉDIO - Equipe não será notificada de problemas

**Problema**:
- Tabelas `alert_config` e `alert_history` existem mas não estão sendo usadas
- Nenhum alerta está configurado
- Sem notificação por email/WhatsApp

**Ações Necessárias**:
1. [ ] Configurar alertas em `alert_config`:
   - Circuit breaker OPEN > 5 min
   - Taxa de erro > 5%
   - DLQ com > 20 itens
   - Tempo de resposta > 5s (p95)
2. [ ] Implementar edge function `send-alerts`
3. [ ] Integrar com email (Locaweb) ou WhatsApp
4. [ ] Testar disparo de alerta

**Tempo Estimado**: 2 horas

---

## 🟡 PROBLEMAS IMPORTANTES (NÃO-BLOQUEADORES)

### 4. Testes End-to-End Ausentes
**Impacto**: 🟡 MÉDIO - Bugs podem passar despercebidos

**O que falta**:
- [ ] Teste de fluxo completo: Cliente entra → Cloé roteia → Agente resolve
- [ ] Teste de criação de ticket no IXC
- [ ] Teste de agendamento de instalação
- [ ] Teste de envio de email
- [ ] Teste de campanha WhatsApp (quando funcionar)

**Tempo Estimado**: 3 horas

---

### 5. DLQ Não Testado em Produção
**Impacto**: 🟡 MÉDIO - Ações falhadas podem não ser reprocessadas

**O que falta**:
- [ ] Verificar se cron job `retry-failed-actions` está rodando
- [ ] Simular uma falha e verificar se entra no DLQ
- [ ] Verificar se retry automático funciona (5 em 5 min)
- [ ] Testar estado `abandoned` após 3 tentativas

**Como Testar**:
1. Desabilitar IXC temporariamente
2. Tentar criar ticket
3. Verificar registro em `failed_actions`
4. Aguardar 5 min e verificar retry
5. Re-habilitar IXC e verificar resolução

**Tempo Estimado**: 1 hora

---

### 6. Logs Não Estruturados
**Impacto**: 🟢 BAIXO - Dificulta debugging mas não impede operação

**Problema**:
- Logs em formato inconsistente
- Sem request_id para correlação
- Difícil rastrear fluxo completo de uma requisição

**Ações Necessárias**:
1. [ ] Adicionar `request_id` em todas edge functions
2. [ ] Padronizar formato de log: `[TIMESTAMP] [LEVEL] [REQUEST_ID] mensagem`
3. [ ] Adicionar mais contexto (user_id, agent_name, etc.)

**Tempo Estimado**: 2 horas

---

### 7. Health Check Não Monitorado
**Impacto**: 🟢 BAIXO - Health check existe mas ninguém olha

**O que falta**:
- [ ] Dashboard visual de health check (frontend)
- [ ] Integrar health check com alertas
- [ ] Configurar ping externo (ex: UptimeRobot)

**Tempo Estimado**: 1 hora

---

### 8. Backup Não Configurado
**Impacto**: 🟢 BAIXO - Supabase já faz backup automático, mas...

**O que falta**:
- [ ] Configurar retenção de 30 dias explícita
- [ ] Testar restore de backup
- [ ] Documentar procedimento de restore

**Tempo Estimado**: 1 hora

---

## 📋 CHECKLIST PRÉ-PRODUÇÃO DETALHADO

### 🔴 CRÍTICO - BLOQUEADORES (Total: 3 itens)

#### 1. Evolution API - WhatsApp
- [ ] Identificar instância ativa
- [ ] Atualizar código com instância correta
- [ ] Testar envio de mensagem
- [ ] Testar recebimento via webhook
- [ ] Documentar configuração

#### 2. IXC - Validação Completa
- [ ] Validar URL base acessível
- [ ] Testar autenticação
- [ ] Testar endpoint `/cliente` (busca)
- [ ] Testar endpoint `/su_oss_chamado` (ticket)
- [ ] Testar endpoint `/fn_areceber` (faturas)
- [ ] Testar endpoint `/radusuarios` (status)
- [ ] Documentar endpoints validados

#### 3. Alertas - Configuração Básica
- [ ] Configurar alerta: Circuit breaker OPEN
- [ ] Configurar alerta: Taxa de erro > 5%
- [ ] Configurar alerta: DLQ > 20 itens
- [ ] Testar disparo de alerta
- [ ] Documentar procedimento de alerta

---

### 🟡 IMPORTANTE - NÃO-BLOQUEADORES (Total: 5 itens)

#### 4. Testes End-to-End
- [ ] Teste: Fluxo completo cliente → agente
- [ ] Teste: Criação de ticket IXC
- [ ] Teste: Agendamento instalação
- [ ] Teste: Envio de email
- [ ] Teste: Busca de cliente por CPF

#### 5. DLQ - Validação
- [ ] Verificar cron job ativo
- [ ] Simular falha → DLQ
- [ ] Verificar retry automático
- [ ] Verificar estado `abandoned`
- [ ] Documentar fluxo de DLQ

#### 6. Logs - Padronização
- [ ] Adicionar `request_id` em todas funções
- [ ] Padronizar formato de log
- [ ] Adicionar contexto (user_id, etc.)
- [ ] Atualizar guia de debugging

#### 7. Health Check - Monitoramento
- [ ] Criar dashboard visual
- [ ] Integrar com alertas
- [ ] Configurar ping externo (opcional)

#### 8. Backup - Validação
- [ ] Configurar retenção 30 dias
- [ ] Testar restore
- [ ] Documentar procedimento

---

### 🟢 MELHORIAS FUTURAS (Pós-Produção)

#### 9. Cache Distribuído
- [ ] Avaliar necessidade de Redis
- [ ] Implementar cache de consultas IXC
- [ ] Testar impacto em performance

#### 10. Rate Limiting Granular
- [ ] Limites por endpoint
- [ ] Limites por usuário/role
- [ ] Dashboard de rate limiting

#### 11. Otimização de Queries
- [ ] Identificar queries lentas (> 500ms)
- [ ] Adicionar índices necessários
- [ ] Implementar paginação

#### 12. Monitoramento de Negócio
- [ ] KPIs visuais (tempo médio atendimento)
- [ ] Taxa de conversão por agente
- [ ] NPS em tempo real
- [ ] Receita projetada vs real

---

## ⏱️ TIMELINE ESTIMADO

### Fase 1: Bloqueadores (1 dia útil)
- **Evolution API**: 30 min
- **IXC Validação**: 1h
- **Alertas Básicos**: 2h
- **Buffer**: 1h
- **Total**: ~5 horas (1 dia)

### Fase 2: Importantes (2 dias úteis)
- **Testes E2E**: 3h
- **DLQ Validação**: 1h
- **Logs Padronização**: 2h
- **Health Check Dashboard**: 1h
- **Backup Teste**: 1h
- **Buffer**: 2h
- **Total**: ~10 horas (2 dias)

### Fase 3: Deploy e Validação (1 dia útil)
- **Deploy em staging**: 1h
- **Testes em staging**: 2h
- **Ajustes**: 2h
- **Deploy produção**: 1h
- **Monitoramento pós-deploy**: 2h
- **Total**: ~8 horas (1 dia)

**TOTAL ESTIMADO: 4 dias úteis**

---

## 🎯 CRITÉRIOS DE GO/NO-GO

### ✅ GO (Pode ir para produção)
Todos os itens CRÍTICOS concluídos:
- ✅ Evolution API funcionando
- ✅ IXC validado e funcional
- ✅ Alertas básicos configurados
- ✅ Pelo menos 3 testes E2E passando
- ✅ DLQ validado funcionando

### ❌ NO-GO (NÃO pode ir para produção)
Se algum dos itens abaixo:
- ❌ WhatsApp ainda retornando 404
- ❌ IXC inacessível ou com credenciais incorretas
- ❌ Circuit breaker abrindo constantemente (> 3x/hora)
- ❌ Taxa de erro > 10% em testes
- ❌ DLQ não processando ações

---

## 📊 MATRIZ DE RISCO

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| WhatsApp não funcionar | 🔴 Alta | 🔴 Alto | Testar antes de produção, ter plano B (email) |
| IXC offline durante deploy | 🟡 Média | 🔴 Alto | Deploy fora de horário pico, circuit breaker protege |
| Sobrecarga de requisições | 🟢 Baixa | 🟡 Médio | Circuit breaker otimizado, concorrência limitada |
| Bugs em produção | 🟡 Média | 🟡 Médio | Monitoramento ativo, DLQ captura falhas |
| Perda de dados | 🟢 Baixa | 🔴 Alto | Backup automático Supabase, DLQ para ações |

---

## 📞 PLANO DE ROLLBACK

### Se algo der errado em produção:

1. **Imediato (< 5 min)**:
   - Acessar Supabase Dashboard
   - Ver logs das últimas 30 min
   - Identificar função problemática

2. **Rápido (< 15 min)**:
   - Desabilitar função problemática via Supabase
   - Redirecionar tráfego para função alternativa
   - Comunicar equipe

3. **Completo (< 1 hora)**:
   - Reverter deploy do projeto inteiro
   - Restaurar versão anterior funcional
   - Executar testes de sanidade

---

## 📚 DOCUMENTAÇÃO ATUALIZADA

### Já Existe e Está OK:
- ✅ `docs/operational-guide.md` - Guia operacional básico
- ✅ `docs/system-robustness-100.md` - Arquitetura de robustez
- ✅ `docs/TODO-PRODUCAO.md` - Lista de tarefas
- ✅ `docs/CAUSA-RAIZ-CIRCUIT-BREAKER.md` - Análise técnica

### Precisa Ser Criado:
- [ ] Runbook de incidentes (O que fazer quando X acontecer)
- [ ] Guia de onboarding para operadores
- [ ] Documentação de APIs internas
- [ ] Guia de troubleshooting visual (prints)

---

## 🎓 TREINAMENTO NECESSÁRIO

### Para Operadores (2 horas):
- Como acessar `/system-metrics`
- Interpretar dashboard de métricas
- Identificar alertas críticos
- Procedimento de escalação

### Para Admins (4 horas):
- Arquitetura completa do sistema
- Como debugar edge functions
- Como usar Supabase Dashboard
- Procedimentos de rollback

---

## ✅ CONCLUSÃO

**Sistema está 65% pronto para produção.**

**Bloqueadores (3 itens)**: Evolution API, IXC Validação, Alertas  
**Tempo Estimado**: 4 dias úteis

**Próximos Passos**:
1. ✅ Identificar instância Evolution API correta → 30 min
2. ✅ Validar IXC completamente → 1h
3. ✅ Configurar alertas básicos → 2h
4. ✅ Executar testes E2E → 3h
5. ✅ Deploy staging + validação → 1 dia
6. ✅ Deploy produção + monitoramento → 1 dia

**Data Alvo Produção**: 2025-10-13 (assumindo início hoje)

---

**Última Atualização**: 2025-10-09  
**Responsável**: Sistema IA Lovable  
**Status**: 🟡 EM PREPARAÇÃO PARA PRODUÇÃO
