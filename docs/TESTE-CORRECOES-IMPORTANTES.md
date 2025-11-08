# 🧪 Guia de Testes - Correções Importantes

**Objetivo:** Validar implementação das correções de prioridade **importante** entre `whatsapp-webhook` e `routing-agent`.

---

## 🎯 Cenários de Teste

### ✅ Cenário 1: Metadata de Routing Técnico

**Fluxo:**
1. Cliente envia mensagem técnica: *"Minha internet está lenta"*
2. Routing-agent detecta problema técnico
3. Metadata deve ser salvo em `conversations.metadata`

**Validação:**
```sql
-- Buscar conversa recente
SELECT 
  id,
  customer_name,
  metadata->'last_routing' as routing_info
FROM conversations
WHERE customer_phone = '5561999999999'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado Esperado:**
```json
{
  "timestamp": "2025-11-08T14:32:10.123Z",
  "agent": "support_tech",
  "targetDepartment": "tecnico",
  "autoRouted": true,
  "routeReason": "connection_issue",
  "needsCPF": false,
  "rateLimited": false,
  "hasMessage": true,
  "messageLength": 245
}
```

---

### ✅ Cenário 2: Metadata de Routing Financeiro

**Fluxo:**
1. Cliente envia: *"Qual o valor da minha fatura?"*
2. Routing detecta questão financeira
3. Metadata salvo com agent = support_financial

**Validação:**
```sql
SELECT 
  metadata->'last_routing'->>'agent' as agent,
  metadata->'last_routing'->>'targetDepartment' as dept,
  metadata->'last_routing'->>'routeReason' as reason
FROM conversations
WHERE id = '<conversation_id>';
```

**Resultado Esperado:**
```
agent: "support_financial"
dept: "financeiro"
reason: "billing_inquiry"
```

---

### ✅ Cenário 3: Rate Limit com Metadata

**Fluxo:**
1. Cliente envia 4+ mensagens em 15min
2. Routing retorna rateLimited = true
3. Metadata deve refletir o bloqueio

**Validação:**
```sql
SELECT 
  metadata->'last_routing'->>'rateLimited' as rate_limited,
  metadata->'last_routing'->>'timestamp' as last_attempt,
  status
FROM conversations
WHERE customer_phone = '5561999999999'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado Esperado:**
```
rate_limited: "true"
status: "resolved"
```

---

### ✅ Cenário 4: Falha Não-Bloqueante de Metadata

**Fluxo:**
1. Simular erro no update de metadata (ex: campo inválido)
2. Fluxo principal deve continuar
3. Mensagem enviada ao cliente mesmo com erro

**Como Simular:**
```typescript
// Temporariamente no código:
const routingMetadata = {
  invalid_field: new Date() // Erro proposital
};
```

**Validação:**
```bash
# Verificar logs da edge function
# Deve conter:
"⚠️ Failed to save routing metadata"

# MAS também:
"✅ WhatsApp message sent successfully"
```

**Resultado Esperado:**
- ⚠️ Log de erro de metadata
- ✅ Mensagem entregue ao cliente
- ✅ Conversa continua normalmente

---

## 📊 Métricas de Validação

### Query 1: Taxa de Cobertura de Metadata
```sql
-- % de conversas com metadata nas últimas 24h
SELECT 
  COUNT(*) FILTER (WHERE metadata ? 'last_routing') * 100.0 / NULLIF(COUNT(*), 0) as coverage_percent,
  COUNT(*) FILTER (WHERE metadata ? 'last_routing') as with_metadata,
  COUNT(*) as total_conversations
FROM conversations
WHERE created_at > now() - interval '24 hours';
```

**Meta:** ≥ 95% (pode haver conversas antigas)

---

### Query 2: Distribuição de Agentes Roteados
```sql
-- Contagem por agente nas últimas 24h
SELECT 
  metadata->'last_routing'->>'agent' as agent,
  COUNT(*) as routing_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM conversations
WHERE 
  created_at > now() - interval '24 hours'
  AND metadata ? 'last_routing'
GROUP BY metadata->'last_routing'->>'agent'
ORDER BY routing_count DESC;
```

**Resultado Esperado:**
```
agent              | routing_count | percentage
-------------------+---------------+-----------
support_tech       | 45            | 60.00
support_financial  | 25            | 33.33
routing-agent      | 5             | 6.67
```

---

### Query 3: Tempo Médio de Roteamento
```sql
-- Verificar overhead de salvamento de metadata
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_routing_seconds
FROM conversations
WHERE 
  created_at > now() - interval '1 hour'
  AND metadata ? 'last_routing';
```

**Meta:** < 0.5 segundos (metadata não deve adicionar latência significativa)

---

### Query 4: Rotas Falhadas
```sql
-- Conversas sem metadata mas com mensagens de agente
SELECT 
  c.id,
  c.customer_name,
  c.created_at,
  COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN conversation_messages m ON c.id = m.conversation_id AND m.sender_type = 'agent'
WHERE 
  c.created_at > now() - interval '24 hours'
  AND NOT (c.metadata ? 'last_routing')
  AND m.id IS NOT NULL
GROUP BY c.id, c.customer_name, c.created_at
ORDER BY c.created_at DESC;
```

**Meta:** 0 conversas (todas devem ter metadata se houve roteamento)

---

## 🔍 Logs a Monitorar

### Whatsapp-Webhook Logs
```bash
# Logs esperados após routing:
✅ "Routing metadata saved to conversation"

# Em caso de erro (não bloqueante):
⚠️ "Failed to save routing metadata"
```

### Como Verificar
1. Acessar: https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions/whatsapp-webhook/logs
2. Filtrar por: `"metadata saved"` ou `"Failed to save routing"`
3. Verificar frequência de erros

---

## ✅ Checklist de Validação

### Funcional
- [ ] Metadata salvo em 100% dos roteamentos bem-sucedidos
- [ ] Estrutura JSON correta em `conversations.metadata`
- [ ] Falha de metadata não interrompe fluxo principal
- [ ] Mensagens enviadas mesmo com erro de metadata

### Performance
- [ ] Overhead < 100ms para salvar metadata
- [ ] Sem degradação na taxa de resposta
- [ ] Logs sem erros críticos relacionados a metadata

### Rastreabilidade
- [ ] Possível auditar rotas dos últimos 90 dias
- [ ] Query de distribuição de agentes funciona
- [ ] Histórico preservado em re-roteamentos

---

## 🚨 Critérios de Rollback

**Reverter se:**
1. Taxa de cobertura < 90% após 1 hora
2. Overhead de metadata > 200ms
3. Erros bloqueantes em produção
4. Falha na entrega de mensagens por causa de metadata

---

## 📈 Próximas Melhorias (Opcional)

### Baixa Prioridade
1. **testMode flag** - útil para QA
2. **Circuit breaker** - fallback automático
3. **Dashboard de métricas** - visualização de rotas

### Já Implementado
✅ Validação de payload com Zod  
✅ Try/catch robusto  
✅ CORS correto  
✅ Uso de `supabase.functions.invoke()`  
✅ Metadata de rastreabilidade  

---

## 🔗 Documentação Relacionada

- [Correções Críticas](./CORRECOES-CRITICAS-WEBHOOK-ROUTING.md)
- [Correções Importantes](./CORRECOES-IMPORTANTES-WEBHOOK-ROUTING.md)
- [Teste das Críticas](./TESTE-CORRECOES-CRITICAS.md)
