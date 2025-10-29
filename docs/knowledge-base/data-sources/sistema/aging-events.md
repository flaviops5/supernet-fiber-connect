# Aging Events — Marcos Temporais (PR #19)

## 📊 Objetivo

Rastrear o **tempo total de resolução** de cada atendimento, do início até o fechamento, permitindo identificar gargalos e otimizar fluxos.

---

## 🎯 Quando Marcar Events

| Step | Quando Marcar | Meta Recomendado | Exemplo |
|------|---------------|------------------|---------|
| `start` | Início da conversa (1ª mensagem do cliente) | `{ agent: 'support-tech' }` | Cliente entra no chat |
| `scenario_a_start` | Cliente entra no Cenário A (offline) | `{ scenario: 'A', issue: 'offline' }` | Diagnosticou que está offline |
| `scenario_b_start` | Cliente entra no Cenário B (intermitente) | `{ scenario: 'B', issue: 'intermittent' }` | Diagnosticou quedas frequentes |
| `scenario_c_start` | Cliente entra no Cenário C (Wi-Fi/lento) | `{ scenario: 'C', issue: 'wifi_slow' }` | Problema de Wi-Fi detectado |
| `scenario_d_start` | Cliente entra no Cenário D (ticket) | `{ scenario: 'D', reason: 'complex_issue' }` | Escalou para visita técnica |
| `reboot_requested` | Luan solicita reboot da ONU | `{ method: 'remote' }` | "Vamos reiniciar o equipamento" |
| `signal_checked` | Consulta sinal ONU (RX/TX) | `{ rx_dbm: -24.5, tx_dbm: 2.1 }` | Chamou `ixc-onu-signal` |
| `ticket_opened` | Abre ticket IXC (Cenário D) | `{ ixc_ticket_id: '12345', reason: 'optical_issue' }` | Ticket criado no IXC |
| `resolved` | Cliente confirma resolução | `{ method: 'remote' }` ou `{ method: 'onsite' }` | "Problema resolvido!" |

---

## 📈 Interpretação de Métricas

### **p50 (Mediana)**

Tempo que **50% dos atendimentos** levam para resolver:

- ✅ **< 10 min**: Excelente (maioria resolvida rápido)
- ⚠️ **10-20 min**: Aceitável (considerar otimizações)
- ❌ **> 20 min**: Crítico (investigar gargalos no fluxo)

### **p90 (Percentil 90)**

Tempo que **90% dos atendimentos** levam para resolver (detecta picos):

- ✅ **< 30 min**: Bom (picos controlados)
- ⚠️ **30-60 min**: Atenção (casos complexos demoram)
- ❌ **> 60 min**: Preocupante (revisar Cenário D e escalações)

---

## 🔧 Como Usar no Código

### Exemplo: Marcar início de atendimento

```typescript
import { markAgingEvent } from "../_shared/aging.ts";

// Logo após identificar conversation_id
await markAgingEvent(supabaseAdmin, {
  conversation_id,
  step: 'start',
  meta: { agent: 'support-tech' }
});
```

### Exemplo: Marcar resolução

```typescript
// Quando cliente confirma que problema foi resolvido
await markAgingEvent(supabaseAdmin, {
  conversation_id,
  step: 'resolved',
  meta: { 
    method: 'remote',  // ou 'onsite' se foi visita técnica
    scenario: flowState?.scenario
  }
});
```

### Exemplo: Marcar abertura de ticket

```typescript
// Após criar ticket no IXC
await markAgingEvent(supabaseAdmin, {
  conversation_id,
  step: 'ticket_opened',
  meta: { 
    scenario: 'D',
    ixc_ticket_id: ticketId,
    reason: 'optical_issue'
  }
});
```

---

## 📊 Dashboard

Acesse `/admin/kpi-support` para visualizar:

- **Cards de Aging**: p50 e p90 dos últimos 14 dias
- **Tendências**: Gráfico temporal de aging médio
- **Alertas**: Quando p50 > 20 min ou p90 > 60 min

---

## 🧹 Limpeza Automática

- Dados com **> 90 dias** são removidos automaticamente (job diário às 3AM UTC)
- Mantém apenas dados recentes para performance
- Ver: `supabase/migrations/20251029_pr19_cleanup_job.sql`

---

## ⚠️ Importante

- **NÃO bloqueie o fluxo**: `markAgingEvent()` é fire-and-forget
- **Sempre marque `start` e `resolved`**: São obrigatórios para calcular aging
- **Use `meta` para contexto**: Ajuda a debugar casos específicos
- **Steps intermediários são opcionais**: Só marque se for útil para análise

---

## 🎯 Meta de Qualidade

Para manter **excelência no atendimento**:

- 🎯 **Target p50**: < 12 min
- 🎯 **Target p90**: < 35 min
- 📈 Revisar semanalmente e ajustar fluxos conforme necessário
