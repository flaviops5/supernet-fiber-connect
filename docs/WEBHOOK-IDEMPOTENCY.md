# 🔒 Webhook Idempotency - Item 11 Auditoria

**Status:** ✅ Implementado  
**Data:** 2025-11-13  
**Prioridade:** Alta

---

## 📋 Resumo

Implementação completa de idempotência para webhooks críticos, prevenindo processamento duplicado de mensagens e eventos através de:

1. **Tabela `webhook_events`** - Registro centralizado de eventos processados
2. **Helper compartilhado** - Lógica reutilizável de deduplicação
3. **Integração nos webhooks** - Proteção em `whatsapp-webhook`, `nps-webhook` e `webhook-alerts`

---

## 🎯 Objetivo

Prevenir que eventos duplicados (mensagens WhatsApp, respostas NPS, alertas) sejam processados múltiplas vezes, evitando:

- **Mensagens duplicadas** enviadas aos clientes
- **Cobranças duplicadas** em APIs externas
- **Dados inconsistentes** no banco de dados
- **Alertas em duplicidade** enviados para sistemas externos

---

## 🏗️ Arquitetura

### 1. Tabela `webhook_events`

```sql
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_name TEXT NOT NULL,          -- Nome do webhook
  event_id TEXT NOT NULL,              -- Identificador único do evento
  event_type TEXT NOT NULL,            -- Tipo de evento
  payload JSONB NOT NULL,              -- Payload completo (auditoria)
  processed_at TIMESTAMP NOT NULL,     -- Quando foi processado
  created_at TIMESTAMP NOT NULL,       -- Quando foi registrado
  metadata JSONB,                      -- Dados adicionais (trace_id, etc)
  
  -- Constraint de unicidade
  CONSTRAINT webhook_events_unique_event 
    UNIQUE (webhook_name, event_id)
);
```

**Índices criados:**
- `webhook_name` - Busca rápida por webhook
- `created_at DESC` - Limpeza de eventos antigos
- `event_type` - Filtragem por tipo

### 2. Helper Compartilhado

**Arquivo:** `supabase/functions/_shared/webhook-idempotency.ts`

#### Funções disponíveis:

##### `checkDuplicateEvent()`
Verifica se um evento já foi processado:

```typescript
const result = await checkDuplicateEvent(
  supabase,
  'whatsapp-webhook',
  messageId
);

if (result.isDuplicate) {
  // Rejeitar evento duplicado
}
```

##### `registerWebhookEvent()`
Registra um evento após processamento bem-sucedido:

```typescript
await registerWebhookEvent(supabase, {
  webhookName: 'nps-webhook',
  eventId: `${campaign_id}-${recipient_id}`,
  eventType: 'nps_response',
  payload: { score, customer_name },
  metadata: { trace_id: traceId }
});
```

##### `checkAndRegisterEvent()` ⭐ **RECOMENDADO**
Verifica E registra em uma única operação atômica:

```typescript
const isNewEvent = await checkAndRegisterEvent(supabase, {
  webhookName: 'whatsapp-webhook',
  eventId: messageId,
  eventType: 'messages.upsert',
  payload: { instance, timestamp },
  metadata: { trace_id: traceId }
});

if (!isNewEvent) {
  // Evento duplicado - rejeitar
  return { success: true, status: 'duplicate_rejected' };
}

// Continuar processamento...
```

**Vantagens:**
- ✅ Operação atômica (previne race conditions)
- ✅ Menos queries ao banco
- ✅ Fail-open em caso de erro (permite processamento)

---

## 🔌 Webhooks Protegidos

### 1. **whatsapp-webhook**

**Event ID:** `messageData.key.id` (messageId do WhatsApp)

```typescript
const messageId = webhookData.data?.key?.id;

const isNewEvent = await checkAndRegisterEvent(supabase, {
  webhookName: 'whatsapp-webhook',
  eventId: messageId,
  eventType: webhookData.event,
  payload: { instance, event, timestamp },
  metadata: { trace_id: traceId, hmac_signature }
});
```

**Comportamento:**
- Rejeita mensagens duplicadas com status `duplicate_rejected`
- Registra métrica `webhook_duplicate_rejected`
- Log: `⏭️ Duplicate webhook event rejected`

### 2. **nps-webhook**

**Event ID:** `${campaign_id}-${recipient_id}` (único por resposta)

```typescript
const eventId = `${campaign_id}-${recipient_id}`;

const isNewEvent = await checkAndRegisterEvent(supabase, {
  webhookName: 'nps-webhook',
  eventId: eventId,
  eventType: 'nps_response',
  payload: { campaign_id, recipient_id, score },
  metadata: { trace_id: traceId, user_id }
});
```

**Comportamento:**
- Previne respostas NPS duplicadas
- Registra métrica `nps_webhook_duplicate_rejected`
- Retorna mensagem amigável ao cliente

### 3. **webhook-alerts**

**Event ID:** `alert.id` (UUID do alerta)

```typescript
const eventId = alert.id;

const isNewEvent = await checkAndRegisterEvent(supabase, {
  webhookName: 'webhook-alerts',
  eventId: eventId,
  eventType: alert.alert_type,
  payload: { alert_id, severity, message },
  metadata: { trace_id: traceId, webhook_url }
});

if (!isNewEvent) {
  duplicateCount++;
  continue; // Pular alerta duplicado
}
```

**Comportamento:**
- Pula alertas já enviados
- Conta duplicados separadamente
- Retorna `alerts_duplicates` na resposta

---

## 📊 Métricas

### Métricas registradas:

1. **`webhook_duplicate_rejected`**
   - Webhook: `whatsapp-webhook`
   - Dimensões: `webhook_name`, `event_type`

2. **`nps_webhook_duplicate_rejected`**
   - Webhook: `nps-webhook`
   - Dimensões: `campaign_id`, `response_channel`

3. **`webhook_alert_duplicate_skipped`**
   - Webhook: `webhook-alerts`
   - Dimensões: `alert_type`, `severity`

### Queries úteis:

```sql
-- Total de duplicados por webhook
SELECT 
  webhook_name,
  COUNT(*) as total_events
FROM webhook_events
GROUP BY webhook_name;

-- Duplicados nas últimas 24h
SELECT 
  webhook_name,
  event_type,
  COUNT(*) as count
FROM webhook_events
WHERE created_at > now() - interval '24 hours'
GROUP BY webhook_name, event_type
ORDER BY count DESC;

-- Taxa de duplicação
WITH stats AS (
  SELECT 
    webhook_name,
    COUNT(*) as total_attempts,
    COUNT(DISTINCT event_id) as unique_events
  FROM webhook_events
  WHERE created_at > now() - interval '7 days'
  GROUP BY webhook_name
)
SELECT 
  webhook_name,
  total_attempts,
  unique_events,
  (total_attempts - unique_events) as duplicates,
  ROUND((total_attempts - unique_events)::numeric / total_attempts * 100, 2) as duplicate_rate_pct
FROM stats;
```

---

## 🧹 Manutenção

### Limpeza automática

Função para remover eventos com mais de 30 dias:

```sql
SELECT public.cleanup_old_webhook_events();
-- Retorna: número de eventos removidos
```

**Recomendação:** Agendar via cron job:

```sql
SELECT cron.schedule(
  'cleanup-webhook-events',
  '0 3 * * *', -- Todo dia às 3h da manhã
  $$
  SELECT public.cleanup_old_webhook_events();
  $$
);
```

---

## 🧪 Como Testar

### Teste 1: Mensagem WhatsApp duplicada

```bash
# Enviar a mesma mensagem 2 vezes
curl -X POST 'http://localhost:54321/functions/v1/whatsapp-webhook' \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "messages.upsert",
    "instance": "test",
    "data": {
      "key": { "id": "test-msg-123", "fromMe": false },
      "message": { "conversation": "Olá" }
    }
  }'

# Segunda chamada deve retornar:
{
  "success": true,
  "status": "duplicate_rejected",
  "message_id": "test-msg-123"
}
```

### Teste 2: Resposta NPS duplicada

```bash
# Enviar mesma resposta 2 vezes
curl -X POST 'http://localhost:54321/functions/v1/nps-webhook' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "campaign_id": "campaign-123",
    "recipient_id": "recipient-456",
    "customer_name": "João",
    "score": 9
  }'

# Segunda chamada deve retornar:
{
  "success": true,
  "status": "duplicate_rejected",
  "message": "Esta resposta NPS já foi processada anteriormente"
}
```

### Teste 3: Alertas duplicados

```bash
# Verificar logs do webhook-alerts
# Deve mostrar:
logger.warn('⏭️ Duplicate alert skipped (idempotency)', { alert_id })

# E na resposta:
{
  "success": true,
  "alerts_sent": 5,
  "alerts_duplicates": 2,  // <- Contagem de duplicados
  "alerts_failed": 0
}
```

---

## ✅ Benefícios

### 1. **Prevenção de duplicação**
- ✅ Mensagens WhatsApp não são enviadas 2x
- ✅ Respostas NPS não são contabilizadas em duplicidade
- ✅ Alertas não são enviados múltiplas vezes

### 2. **Economia de custos**
- ✅ Menos chamadas à Evolution API (cobrada por mensagem)
- ✅ Menos processamento desnecessário
- ✅ Menos espaço usado no banco

### 3. **Confiabilidade**
- ✅ Operações atômicas (sem race conditions)
- ✅ Fail-open (permite processamento em caso de erro)
- ✅ Auditoria completa (payload salvo)

### 4. **Observabilidade**
- ✅ Métricas de duplicação por webhook
- ✅ Logs estruturados com trace_id
- ✅ Queries SQL para análise

---

## 🔗 Relacionados

- ✅ [Correções Críticas - Webhook Routing](./CORRECOES-CRITICAS-WEBHOOK-ROUTING.md)
- ✅ [Correções Importantes - Webhook Routing](./CORRECOES-IMPORTANTES-WEBHOOK-ROUTING.md)
- 📊 [Métricas e Observabilidade](./METRICAS-OBSERVABILIDADE.md)

---

## 📝 Notas Técnicas

### Race Conditions

A função `checkAndRegisterEvent()` usa INSERT direto:

```typescript
const { error } = await supabase
  .from('webhook_events')
  .insert({ webhook_name, event_id, ... });

if (error?.code === '23505') {
  // Violação de UNIQUE constraint = duplicado
  return false;
}
```

**Vantagens:**
- Operação atômica garantida pelo banco
- Previne race conditions mesmo com múltiplos workers
- Constraint `UNIQUE (webhook_name, event_id)` garante unicidade

### Fail-Open vs Fail-Closed

**Implementação atual: Fail-Open**

Em caso de erro ao verificar duplicação:
```typescript
if (error && error.code !== '23505') {
  console.error('Error checking idempotency:', error);
  return true; // Permitir processamento
}
```

**Justificativa:**
- Melhor processar um evento 2x do que perdê-lo
- Erros de banco não devem bloquear webhooks críticos
- Métricas mostrarão se há problemas

**Alternativa (Fail-Closed):**
Se houver necessidade extrema de prevenir duplicação:
```typescript
if (error) {
  throw new Error('Idempotency check failed');
}
```

---

## 🚀 Próximos Passos (Opcional)

1. **Cron job automático** para limpeza de eventos antigos
2. **Dashboard** com taxa de duplicação por webhook
3. **Alertas** se taxa de duplicação exceder 5%
4. **TTL no banco** (auto-delete após 30 dias)
5. **Replay** de eventos a partir do registro
