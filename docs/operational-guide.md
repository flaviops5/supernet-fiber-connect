# 📖 Guia Operacional - Sistema SUPERNET FIBRA

**Versão**: 2.0  
**Data**: 13/10/2025  
**Última atualização**: 13/10/2025

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Problemas Comuns e Soluções](#problemas-comuns-e-soluções)
3. [Monitoramento e Alertas](#monitoramento-e-alertas)
4. [Procedimentos de Escalação](#procedimentos-de-escalação)
5. [Manutenção Preventiva](#manutenção-preventiva)
6. [Recursos de Emergência](#recursos-de-emergência)

---

## 🎯 Visão Geral

Este guia fornece instruções operacionais para administradores e operadores do sistema SUPERNET FIBRA.

### Acesso Rápido aos Dashboards

- **Métricas do Sistema**: `/system-metrics`
- **Monitoramento de Rede**: `/monitoramento`
- **Atendimento Omnichannel**: `/atendimento`
- **Configurações WhatsApp**: `/admin/whatsapp`

---

## 🔧 Problemas Comuns e Soluções

### 1. Circuit Breaker Aberto

**Sintoma**: Chamadas ao IXC falham com "Circuit breaker is OPEN"

**Solução Imediata**:
```bash
curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/reset-circuit-breaker \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"
```

### 2. WhatsApp Não Envia Mensagens

**Verificação**: Acessar `/admin/whatsapp` e testar conexão

**Soluções comuns**:
- Verificar se instância "SDR2" existe
- Validar `EVOLUTION_API_KEY`
- Verificar logs da Evolution API

### 3. Sistema de Reboot Híbrido (Cloé + Luan)

**Como funciona:**
- **Cloé** detecta cliente OFFLINE → transfere para Luan com flag `suggestAutoReboot`
- **Luan** responde imediatamente + executa reboot em background (não bloqueia)
- Cliente recebe atualização automática após ~66s

**Verificar funcionamento:**
```sql
-- Últimos reboots executados
SELECT * FROM equipment_reboots 
ORDER BY created_at DESC 
LIMIT 10;
```

**Documentação completa:** `docs/reboot-hibrido-implementacao.md`

**Impacto:**
- ✅ Resolve 70-80% dos casos OFFLINE em ~66s
- ✅ Zero tempo de espera ociosa para cliente
- ✅ Cloé mantém simplicidade (apenas +10 linhas)
- ✅ Luan ganha autonomia técnica

---

## 📊 Monitoramento e Alertas

### Health Check Endpoint

```bash
curl https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health
```

Retorna status de:
- Database
- Circuit Breaker
- Agentes online
- Conversas pendentes
- DLQ size
- Mass outages
- Evolution API

---

## 🚨 Procedimentos de Escalação

### Nível 1: Operador
- Resolver problemas comuns
- Monitorar dashboards

### Nível 2: Administrador
- Resetar circuit breakers
- Processar DLQ
- Gerenciar alertas

### Nível 3: DevOps
- Investigar logs críticos
- Deploy hotfixes
- Ajustar configurações

---

## 🔄 Manutenção Preventiva

### Diária
- Verificar dashboard de métricas
- Revisar alertas
- Conferir DLQ

### Semanal
- Processar DLQ manualmente
- Revisar logs de functions
- Limpar cache expirado

---

## 🆘 Recursos de Emergência

**Suporte Lovable**: https://discord.com/channels/1119885301872070706/1280461670979993613

**Supabase Dashboard**: https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp

**Logs Functions**: https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions
