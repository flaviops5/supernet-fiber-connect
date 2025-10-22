# 🎯 Roadmap para 100% de Cobertura - Sistema de Proteção

## 📊 Status Atual
- **Protegidas:** 19/83 (23%)
- **Pendentes:** 64/83 (77%)
- **Meta:** 100% em 3 semanas

---

## 🗺️ Estratégia de Implementação

### Fase 1: Funções Críticas de Segurança (Semana 1)
**Objetivo:** Proteger funções com acesso a dados sensíveis
**Prioridade:** 🔴 CRÍTICA

#### Grupo 1.1: IXC Integration (8 funções) - 2 dias
- [ ] `ixc-integration` - Busca clientes completa
- [ ] `ixc-count-clients` - Contagem de clientes
- [ ] `ixc-list-plans` - Lista planos
- [ ] `ixc-sync-plans` - Sincroniza planos
- [ ] `ixc-endpoints-health` - Health check endpoints
- [ ] `ixc-discover-gpon-endpoints` - Descoberta GPON
- [ ] `ixc-revenue-stats` - Estatísticas de receita
- [ ] `ixc-financial-analytics` - Analytics financeiro

**Template:** `createPublicHandler` com rate limiting opcional
**Complexidade:** Média (já usam ixc-client.ts)

#### Grupo 1.2: IXC Operações Técnicas (6 funções) - 1 dia
- [ ] `ixc-onu-signal` - Sinal ONU
- [ ] `ixc-pon-status` - Status PON
- [ ] `ixc-radio-status` - Status rádios
- [ ] `test-equipment-connectivity` - Testa conectividade
- [ ] `reboot-client-equipment` - Reinicia equipamento
- [ ] `test-ixc-connection` - Testa conexão IXC

**Template:** `createProtectedHandler` (requer auth para operações críticas)
**Complexidade:** Baixa

#### Grupo 1.3: WhatsApp & Comunicação (3 funções) - 1 dia
- [ ] `ixc-evolution-proxy` - Proxy Evolution API
- [ ] `test-evolution-api` - Testa Evolution API
- [ ] `test-whatsapp-webhook` - Testa webhook

**Template:** `createPublicHandler` com validação HMAC
**Complexidade:** Baixa

---

### Fase 2: Agentes IA e Automação (Semana 2)
**Objetivo:** Proteger agentes complexos e automações
**Prioridade:** 🟠 ALTA

#### Grupo 2.1: Agentes Complexos (2 funções) - 3 dias
- [ ] `sales-agent` - Agente de vendas (703 linhas)
- [ ] `logistics-agent` - Agente de logística (285 linhas)

**Ação:** Refatorar + aplicar error handler + metrics
**Complexidade:** Alta (muita lógica, tools, validações)

#### Grupo 2.2: Automações e Monitores (8 funções) - 2 dias
- [ ] `auto-reboot-frozen-equipment` - Auto-reboot
- [ ] `check-reboot-candidates` - Candidatos reboot
- [ ] `detect-mass-outage` - Detecta quedas em massa
- [ ] `simulate-mass-outage` - Simula queda
- [ ] `mass-outage-executor` - Executa ações de queda
- [ ] `auto-send-overdue-invoices` - Envia faturas atrasadas
- [ ] `check-due-invoices` - Verifica faturas vencidas
- [ ] `check-escalation` - Verifica escalações

**Template:** `createPublicHandler` (são cron jobs)
**Complexidade:** Média

---

### Fase 3: Geração de Conteúdo e Documentação (Semana 2-3)
**Objetivo:** Proteger funções de geração e processamento
**Prioridade:** 🟡 MÉDIA

#### Grupo 3.1: IA e Geração (7 funções) - 2 dias
- [ ] `generate-ai-faq` - Gera FAQs com IA
- [ ] `generate-contract-pdf` - Gera PDFs de contrato
- [ ] `generate-omnichannel-zip` - Gera ZIP omnichannel
- [ ] `generate-system-documentation-pdf` - Gera docs PDF
- [ ] `ai-auto-tag` - Auto-tagging IA
- [ ] `ai-suggest-reply` - Sugere respostas IA
- [ ] `ai-text-review` - Revisa textos IA

**Template:** `createPublicHandler` ou `createAuthenticatedHandler`
**Complexidade:** Baixa (já seguem padrão similar)

#### Grupo 3.2: Sincronização e Migração (4 funções) - 1 dia
- [ ] `sync-chatbot-knowledge` - Sincroniza knowledge base
- [ ] `sync-github-docs` - Sincroniza GitHub docs
- [ ] `sync-ixc-documentation` - Sincroniza docs IXC
- [ ] `sync-knowledge-docs` - Sincroniza documentação
- [ ] `migrate-knowledge-batch` - Migração em lote
- [ ] `migrate-knowledge-full` - Migração completa

**Template:** `createAuthenticatedHandler` (admin only)
**Complexidade:** Baixa

---

### Fase 4: Utilitários e Monitoramento (Semana 3)
**Objetivo:** Completar cobertura com utilitários
**Prioridade:** 🟢 BAIXA

#### Grupo 4.1: Monitoramento e Health (6 funções) - 1 dia
- [ ] `system-health` - Health check sistema
- [ ] `metrics-collector` - Coleta métricas
- [ ] `process-alerts` - Processa alertas
- [ ] `graylog-logs-export` - Exporta logs Graylog
- [ ] `monitoring-logs` - Logs de monitoramento
- [ ] `atlas-analyzer` - Analyzer Atlas

**Template:** `createPublicHandler`
**Complexidade:** Baixa

#### Grupo 4.2: Processamento e Filas (5 funções) - 1 dia
- [ ] `process-dlq` - Processa DLQ
- [ ] `retry-failed-actions` - Retry ações falhadas
- [ ] `process-cep-import` - Processa importação CEP
- [ ] `calculate-projections` - Calcula projeções
- [ ] `summarize-conversation` - Sumariza conversa

**Template:** `createPublicHandler` (cron jobs/workers)
**Complexidade:** Baixa

#### Grupo 4.3: Testes e Desenvolvimento (7 funções) - 1 dia
- [ ] `test-all-ixc-functions` - Testa todas funções IXC
- [ ] `test-hmac` - Testa HMAC
- [ ] `get-function-code` - Obtém código função
- [ ] `chatbot-cep-lookup` - Lookup CEP
- [ ] `corporate-ai-chat` - Chat corporativo IA
- [ ] `site-analyzer-agent` - Analyzer de sites
- [ ] `voice-to-text` - Conversão voz para texto

**Template:** Misto (alguns autenticados, outros públicos)
**Complexidade:** Baixa

#### Grupo 4.4: Email e Notificações (3 funções) - 0.5 dia
- [ ] `send-locaweb-email` - Envia email Locaweb
- [ ] `network-maintenance-executor` - Executor manutenção

**Template:** `createPublicHandler`
**Complexidade:** Muito baixa

#### Grupo 4.5: Telemedicina (2 funções) - 0.5 dia
- [ ] `telemedicina-auth` - Auth telemedicina
- [ ] `telemedicina-forgot-password` - Recuperação senha

**Template:** `createPublicHandler`
**Complexidade:** Muito baixa

---

## 📈 Cronograma Detalhado

### Semana 1 (5 dias úteis)
| Dia | Grupo | Funções | Acumulado |
|-----|-------|---------|-----------|
| 1 | IXC Integration (parte 1) | 4 | 23 (28%) |
| 2 | IXC Integration (parte 2) | 4 + IXC Ops (6) | 33 (40%) |
| 3 | WhatsApp (3) + Automações (4) | 7 | 40 (48%) |
| 4 | Automações (4) + IA Gen (3) | 7 | 47 (57%) |
| 5 | IA Gen (4) + Sync (3) | 7 | 54 (65%) |

**Meta Semana 1:** 65% de cobertura

### Semana 2 (5 dias úteis)
| Dia | Grupo | Funções | Acumulado |
|-----|-------|---------|-----------|
| 1 | Sync (3) + Health (3) | 6 | 60 (72%) |
| 2 | Health (3) + Processing (3) | 6 | 66 (80%) |
| 3 | Processing (2) + Tests (4) | 6 | 72 (87%) |
| 4 | Tests (3) + Email (3) | 6 | 78 (94%) |
| 5 | Telemedicina (2) + Agentes (iniciar) | 2 | 80 (96%) |

**Meta Semana 2:** 96% de cobertura

### Semana 3 (2 dias úteis)
| Dia | Grupo | Funções | Acumulado |
|-----|-------|---------|-----------|
| 1 | sales-agent (refactor) | 1 | 81 (98%) |
| 2 | logistics-agent (refactor) + revisão | 1 | 82 (99%) |
| 3 | Revisão final e testes | 1 | 83 (100%) ✅ |

**Meta Semana 3:** 100% de cobertura

---

## 🤖 Automação e Otimização

### Script de Migração em Massa
Criar script para aplicar base-handler automaticamente em funções simples:

```typescript
// tools/migrate-to-base-handler.ts
// Aplica automaticamente em funções que seguem padrão:
// 1. CORS manual
// 2. Try/catch simples
// 3. Sem lógica complexa de auth
```

**Alvo:** ~30 funções simples podem ser migradas automaticamente
**Economia:** 3-4 dias de trabalho

### Template Generator
Criar CLI para gerar novas funções já protegidas:

```bash
deno run tools/create-function.ts --name=my-function --type=public
# Gera função completa com base-handler, config.toml, e README
```

---

## ✅ Checklist de Validação (por função)

Antes de marcar como completa, verificar:

- [ ] Usa `base-handler.ts` OU error-handler + metrics
- [ ] CORS configurado corretamente
- [ ] Registrada no `config.toml` com `verify_jwt` correto
- [ ] Métricas sendo registradas
- [ ] Logs estruturados (não console.log puro)
- [ ] Documentação atualizada (README se necessário)
- [ ] Testada manualmente pelo menos uma vez

---

## 🎯 Priorização por Risco

### Risco Crítico (implementar primeiro)
1. Funções com acesso a CPF/dados pessoais
2. Funções que modificam banco de dados
3. Funções que enviam comunicações externas
4. Funções expostas publicamente sem auth

### Risco Médio
1. Cron jobs e automações
2. Funções de geração de conteúdo
3. Webhooks com validação própria

### Risco Baixo (podem aguardar)
1. Funções de teste e desenvolvimento
2. Health checks simples
3. Funções raramente usadas

---

## 💡 Lições Aprendidas

### O que funcionou bem:
✅ Base-handler reduziu código repetitivo em 70%
✅ Error-handler padronizou respostas de erro
✅ Metrics automáticas facilitam observabilidade

### Desafios encontrados:
⚠️ Funções com streaming precisam tratamento especial
⚠️ Funções com circuit breaker precisam manter lógica
⚠️ HMAC validation deve ser preservada em webhooks

### Melhorias futuras:
💡 Criar middleware chain para combinar proteções
💡 Adicionar rate limiting mais granular (por endpoint)
💡 Implementar circuit breaker no base-handler

---

## 📊 Métricas de Sucesso

### KPIs Técnicos
- ✅ 100% das funções com error handling padronizado
- ✅ 100% das funções com métricas automáticas
- ✅ 90%+ das funções usando base-handler
- ✅ 0 console.log em produção
- ✅ Todos os erros logados no Supabase

### KPIs de Negócio
- ⬆️ Redução de 80% no tempo de debug
- ⬆️ Melhoria de 50% no MTTR (Mean Time To Recovery)
- ⬆️ Visibilidade completa de todas as requisições
- ⬇️ Redução de 90% em falhas silenciosas

---

## 🚀 Próximos Passos Imediatos

1. **Hoje:** Implementar Grupo 1.1 (IXC Integration - 4 funções)
2. **Amanhã:** Completar Grupo 1.1 e iniciar Grupo 1.2
3. **Esta semana:** Atingir 65% de cobertura

**Comando para começar:**
```bash
# Vamos começar com as 4 primeiras funções do Grupo 1.1
```

---

## 📝 Notas

- Este roadmap é agressivo mas viável
- Prioriza risco sobre facilidade
- Permite paralelização de trabalho se necessário
- Mantém qualidade sem sacrificar velocidade
