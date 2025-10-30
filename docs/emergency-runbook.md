# 🆘 Runbook de Emergência - SUPERNET FIBRA

**Versão**: 1.0  
**Data**: 30/10/2025  
**Sistema**: Multi-Agent Omnichannel v1.0.0

---

## 📞 Contatos de Emergência

| Papel | Contato | Disponibilidade |
|-------|---------|-----------------|
| **Suporte Lovable** | [Discord](https://discord.com/channels/1119885301872070706/1280461670979993613) | 24/7 |
| **Supabase Status** | https://status.supabase.com | - |
| **Evolution API** | Verificar documentação interna | - |

---

## 🚨 Emergências Críticas

### 1. Sistema Completamente Fora do Ar

**Sintomas:**
- Nenhum agente responde
- Dashboard inacessível
- Edge Functions retornam 500

**Diagnóstico Rápido:**
```bash
# 1. Verificar Health Check
curl https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health

# 2. Verificar Supabase Status
curl https://status.supabase.com/api/v2/status.json
```

**Ações Imediatas:**
1. ✅ Verificar [Supabase Dashboard](https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp)
2. ✅ Verificar logs das Edge Functions (últimos 5 min)
3. ✅ Se DB está offline: aguardar recuperação automática do Supabase
4. ✅ Se Edge Functions estão offline: verificar deploy recente
5. ✅ **ÚLTIMA OPÇÃO**: Restaurar backup mais recente

**Tempo Esperado de Resolução:** 5-15 minutos

---

### 2. Circuit Breaker Aberto (IXC Fora)

**Sintomas:**
- Mensagem "Circuit breaker is OPEN" nos logs
- Chamadas ao IXC falham sistematicamente
- Dashboard mostra Circuit Breaker em estado OPEN

**Diagnóstico:**
```bash
# Verificar estado do Circuit Breaker
curl https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health | jq '.checks.circuit_breaker'
```

**Ações Imediatas:**
1. ✅ Verificar se IXC está realmente fora (testar API diretamente)
2. ✅ Se IXC voltou: resetar circuit breaker
   ```bash
   curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/reset-circuit-breaker \
     -H "Authorization: Bearer [SUPABASE_ANON_KEY]"
   ```
3. ✅ Se IXC continua fora: ativar modo degradado (manual)

**Tempo Esperado:** 2-5 minutos (se IXC voltar)

---

### 3. WhatsApp Não Envia Mensagens

**Sintomas:**
- Mensagens não chegam aos clientes
- Evolution API retorna erro
- Instância "SDR2" offline

**Diagnóstico:**
```bash
# Testar Evolution API
curl https://[EVOLUTION_URL]/instance/fetchInstances \
  -H "apikey: [EVOLUTION_API_KEY]"
```

**Ações Imediatas:**
1. ✅ Acessar `/admin/whatsapp` e verificar status da instância
2. ✅ Testar conexão manualmente no dashboard
3. ✅ Se instância offline: reconectar QR Code
4. ✅ Verificar se API key está correta nas secrets
5. ✅ Se persistir: verificar logs da Evolution API

**Tempo Esperado:** 3-10 minutos

---

### 4. Queda em Massa Não Detectada

**Sintomas:**
- Múltiplos clientes reportam problema
- Dashboard não mostra alerta de mass outage
- Nenhuma notificação foi enviada

**Diagnóstico:**
```sql
-- Verificar eventos recentes
SELECT * FROM mass_outage_events 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Verificar clientes offline
SELECT COUNT(*) FROM clients 
WHERE status = 'offline';
```

**Ações Imediatas:**
1. ✅ Forçar execução do `detect-mass-outage`:
   ```bash
   curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/detect-mass-outage \
     -H "Authorization: Bearer [SERVICE_ROLE_KEY]"
   ```
2. ✅ Verificar se threshold está muito alto
3. ✅ Ativar processo manual de comunicação se necessário

**Tempo Esperado:** 5-10 minutos

---

### 5. DLQ Crescendo Rapidamente

**Sintomas:**
- DLQ com >100 ações falhadas
- Taxa de erro >10%
- Ações críticas não sendo processadas

**Diagnóstico:**
```sql
-- Ver ações mais falhadas
SELECT action_type, COUNT(*), 
       MAX(error_message) as last_error
FROM action_log 
WHERE result->>'success' = 'false'
GROUP BY action_type
ORDER BY COUNT(*) DESC;
```

**Ações Imediatas:**
1. ✅ Identificar padrão de falhas (mesmo error_message?)
2. ✅ Se erro sistêmico: corrigir causa raiz primeiro
3. ✅ Processar DLQ manualmente:
   ```bash
   curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/retry-failed-actions \
     -H "Authorization: Bearer [SERVICE_ROLE_KEY]"
   ```
4. ✅ Se ações específicas falhando: limpar DLQ seletivamente

**Tempo Esperado:** 10-30 minutos

---

### 6. Luan Auto-Upgrade Travado

**Sintomas:**
- KPIs não estão sendo atualizados
- Última execução >24h atrás
- Cron lock preso

**Diagnóstico:**
```sql
-- Verificar locks ativos
SELECT * FROM cron_execution_locks 
WHERE job_name = 'luan-auto-upgrade'
ORDER BY acquired_at DESC;

-- Verificar última execução
SELECT * FROM agent_global_policies
ORDER BY updated_at DESC LIMIT 5;
```

**Ações Imediatas:**
1. ✅ Liberar lock manualmente:
   ```sql
   DELETE FROM cron_execution_locks 
   WHERE job_name = 'luan-auto-upgrade';
   ```
2. ✅ Executar manualmente:
   ```bash
   curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/luan-auto-upgrade \
     -H "Authorization: Bearer [SERVICE_ROLE_KEY]"
   ```

**Tempo Esperado:** 2-5 minutos

---

### 7. Rollback de Cenário Necessário

**Sintomas:**
- Cenário novo causando problemas
- Taxa de erro aumentou após deploy
- Comportamento inesperado do Luan

**Ações Imediatas:**
1. ✅ Acessar dashboard de rollback: `/admin/scenario-rollback`
2. ✅ Selecionar cenário problemático
3. ✅ Iniciar processo de rollback (3 etapas):
   - Request → Confirm → Apply
4. ✅ Aguardar 5-10min para propagação
5. ✅ Verificar métricas voltaram ao normal

**Tempo Esperado:** 10-20 minutos

---

## 🔧 Ferramentas de Diagnóstico

### Logs em Tempo Real
```bash
# System Health
curl https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health

# Logs de função específica
https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions/[FUNCTION_NAME]/logs

# Alertas recentes
SELECT * FROM alert_history 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Dashboards Críticos
- **Métricas**: `/system-metrics`
- **Monitoramento**: `/admin/monitoramento`
- **Auto-Reboot**: `/admin/auto-reboot`
- **KPI Dashboard**: `/admin/kpi-dashboard`

---

## 📋 Checklist Pós-Incidente

Após resolver uma emergência:

- [ ] Documentar o incidente (o que aconteceu, causa raiz, solução)
- [ ] Atualizar este runbook se necessário
- [ ] Comunicar equipe sobre lições aprendidas
- [ ] Verificar se alertas funcionaram corretamente
- [ ] Revisar logs para entender timeline completo
- [ ] Considerar melhorias para evitar reincidência

---

## 🔄 Escalação

**Nível 1 (Operador)** → Problemas comuns, seguir runbook  
↓ (15 min sem resolução)  
**Nível 2 (Admin/Gestor)** → Decisões de rollback, acesso a secrets  
↓ (30 min sem resolução)  
**Nível 3 (DevOps/Lovable Support)** → Mudanças estruturais, debug profundo

---

## 📚 Recursos Adicionais

- [Documentação Completa](docs/operational-guide.md)
- [Release Notes v1.0.0](docs/PR-32-RELEASE-v1.0.0.md)
- [Critical Fixes PR#33](docs/PR-33-CRITICAL-FIXES.md)
- [Backup Guide](docs/backup-guide.md)

---

**⚠️ IMPORTANTE:** Este runbook deve ser revisado e atualizado a cada incidente crítico.
