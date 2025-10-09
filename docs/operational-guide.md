# 🎯 Guia Operacional - Sistema de Atendimento IA

## 🚀 Quick Start

### 1. Verificar Status do Sistema
```bash
# Health check rápido
curl https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health

# Esperado: {"status":"healthy", ...}
```

### 2. Acessar Dashboard
Abra: `https://seu-app.com/system-metrics`

**O que você verá:**
- ✅ Status geral (Database, IXC, Circuit Breaker)
- 📊 Métricas das últimas 6 horas
- 🔄 Ações pendentes no DLQ
- 🚨 Alertas recentes

---

## 📋 Checklist Diário (Operações)

### Manhã (9h)
- [ ] Acessar `/system-metrics`
- [ ] Verificar taxa de erro (deve ser < 1%)
- [ ] Verificar DLQ (deve estar vazio ou < 5 itens)
- [ ] Verificar circuit breaker (deve estar CLOSED)

### Durante o Dia
- [ ] Monitorar alertas (se houver)
- [ ] Verificar tempo de resposta (deve ser < 3s)
- [ ] Acompanhar volume de atendimentos

### Fim do Dia (18h)
- [ ] Revisar métricas do dia
- [ ] Verificar se há ações abandonadas no DLQ
- [ ] Conferir logs de erros críticos

---

## 🚨 Troubleshooting Guide

### ❌ Problema: Taxa de Erro Alta (> 5%)

**Sintomas:**
- Dashboard mostra error_rate > 5%
- Múltiplas ações no DLQ
- Alertas sendo gerados

**Diagnóstico:**
1. Acessar `/system-metrics`
2. Identificar qual agente tem mais erros
3. Verificar logs do agente no Supabase Dashboard

**Soluções:**
- Se erro é no IXC: Verificar se IXC está online
- Se erro é no proxy: Verificar credenciais IXC
- Se erro é específico de agente: Verificar system prompt

---

### ⚡ Problema: Circuit Breaker OPEN

**STATUS**: ✅ CAUSA RAIZ IDENTIFICADA E CORRIGIDA (2025-10-09)

**Sintomas:**
- Health check mostra circuit_breaker: "open"
- Mensagens de erro: "Circuit breaker OPEN"
- IXC inacessível temporariamente

**Causa Raiz Identificada:**
- `detect-mass-outage` fazia até **1000 requisições paralelas** ao IXC
- Concorrência de 10 requisições simultâneas sobrecarregava o servidor
- Circuit Breaker estava **correto** em abrir para proteger o sistema

**Correções Aplicadas:**
- ✅ Reduzida concorrência de 10→3 requisições (-70%)
- ✅ Aumentado backoff de 1s→2s e 10s→15s
- ✅ Adicionado delay de 3s entre chunks
- ✅ Sistema agora é estável (detecção em 8-10 min vs 30s)

**O que acontece agora:**
- Sistema bloqueia chamadas IXC por 60 segundos após 5 falhas consecutivas
- Após 60s, tenta novamente (half-open)
- Se suceder, volta ao normal (closed)

**Ações:**
1. ✅ **NÃO FAZER NADA** - Sistema se recupera sozinho em ~60s
2. Se persistir > 5min: Verificar se IXC está realmente offline
3. **EMERGÊNCIA APENAS**: Reset manual via edge function
   ```bash
   curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/reset-circuit-breaker \
     -H "Authorization: Bearer <ADMIN_TOKEN>"
   ```

**Documentação Completa**: Ver `docs/CAUSA-RAIZ-CIRCUIT-BREAKER.md`

---

### 🔄 Problema: DLQ com Muitas Ações

**Sintomas:**
- Dashboard mostra > 10 ações pendentes
- Retry count chegando em 3/3
- Ações sendo abandonadas

**Diagnóstico:**
1. Ver lista de ações no dashboard
2. Identificar padrão (mesmo tipo? mesmo cliente?)
3. Verificar error_message de cada ação

**Soluções:**
- Se IXC estava offline: Aguardar retry automático (a cada 5min)
- Se erro de payload: Corrigir manualmente no IXC
- Se ação foi abandonada: Verificar se precisa intervenção manual

---

### 🐌 Problema: Sistema Lento (> 5s)

**Sintomas:**
- Avg response time > 5000ms
- Dashboard mostra alertas de response_time
- Clientes reclamando de demora

**Diagnóstico:**
1. Verificar duration_ms por agente
2. Identificar gargalo (Database? IXC?)
3. Verificar se cache está funcionando

**Soluções:**
- Se IXC lento: Verificar com provedor IXC
- Se Database lento: Verificar queries no Supabase
- Se cache não funciona: Verificar logs do ixc-proxy

---

## 📊 Interpretando as Métricas

### Taxa de Sucesso
- **> 99%:** ✅ Excelente
- **95-99%:** ⚠️ Monitorar
- **< 95%:** 🚨 Investigar urgente

### Tempo de Resposta
- **< 1s:** ✅ Excelente
- **1-3s:** ✅ Bom
- **3-5s:** ⚠️ Monitorar
- **> 5s:** 🚨 Crítico

### DLQ (Failed Actions)
- **0 itens:** ✅ Perfeito
- **1-5 itens:** ✅ Normal (retry automático)
- **5-10 itens:** ⚠️ Atenção
- **> 10 itens:** 🚨 Investigar

---

## 🔧 Manutenção Preventiva

### Semanal
- [ ] Revisar alertas da semana
- [ ] Verificar tendências de erro
- [ ] Limpar ações abandonadas antigas

### Mensal
- [ ] Analisar performance histórica
- [ ] Ajustar thresholds de alerta se necessário
- [ ] Revisar knowledge base dos agentes
- [ ] Backup de action_log

### Trimestral
- [ ] Revisar e otimizar system prompts
- [ ] Analisar padrões de falha
- [ ] Documentar incidentes e resoluções
- [ ] Treinar equipe em novos fluxos

---

## 📞 Quando Escalar para Suporte Técnico

Escalar quando:
- Circuit breaker OPEN por > 10 minutos
- Taxa de erro > 10% persistente
- IXC inacessível por > 30 minutos
- DLQ com > 50 ações pendentes
- Database com erro persistente

**Como escalar:**
1. Capturar screenshot do dashboard
2. Exportar logs recentes (últimas 2 horas)
3. Anotar horário do incidente
4. Contatar: suporte-tecnico@empresa.com

---

## 🎓 Treinamento Rápido

### Para Operadores
**Você precisa saber:**
- Como acessar o dashboard (`/system-metrics`)
- O que significa cada métrica
- Quando um alerta é crítico
- Como interpretar o DLQ

**Você NÃO precisa:**
- Entender código
- Acessar Supabase diretamente
- Mexer em configurações técnicas

### Para Desenvolvedores
**Você precisa entender:**
- Arquitetura completa (ver `/gpt_5`)
- Como adicionar novo agente
- Como modificar system prompts
- Como debugar edge functions

**Leitura obrigatória:**
- `docs/system-robustness-100.md`
- Código em `supabase/functions/`
- Documentação em `/gpt_5`

---

## 🔐 Segurança - Checklist

- [ ] HMAC_SHARED_SECRET configurado (Supabase Secrets)
- [ ] IXC credentials não expostas no código
- [ ] RLS policies ativas em todas tabelas
- [ ] Rate limiting ativo (10 msg/min por CPF)
- [ ] Logs de segurança habilitados
- [ ] HTTPS em todas comunicações

---

## 📈 KPIs Recomendados

| KPI | Meta | Crítico se |
|-----|------|------------|
| Uptime | > 99.5% | < 99% |
| Taxa de Sucesso | > 99% | < 95% |
| Tempo de Resposta (p95) | < 3s | > 5s |
| DLQ Size | < 5 | > 20 |
| Error Rate | < 1% | > 5% |
| Circuit Breaker | CLOSED | OPEN > 5min |

---

## 🎯 Objetivos de Melhoria Contínua

### Curto Prazo (1-3 meses)
- Reduzir tempo de resposta para < 2s (p95)
- Manter error rate < 0.5%
- Zero ações abandonadas no DLQ

### Médio Prazo (3-6 meses)
- Implementar distributed tracing
- A/B testing de system prompts
- Feedback loop automático

### Longo Prazo (6-12 meses)
- ML para predição de falhas
- Auto-scaling baseado em load
- Multi-region deployment

---

## 📚 Recursos Adicionais

- **Dashboard:** `/system-metrics`
- **Documentação Técnica:** `/gpt_5`
- **Health Check:** `https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health`
- **Supabase Dashboard:** `https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp`
- **Edge Functions Logs:** `https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions`
