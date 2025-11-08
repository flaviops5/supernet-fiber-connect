# 🧪 Teste das Correções Críticas

**Data:** 2025-11-08  
**Status:** Pronto para teste  

---

## 🎯 Checklist de Validação

### ✅ Correção #1: Validação de Payload

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

**O que foi feito:**
- Adicionado schema Zod para validação de payload
- Normalização de `context` → `customerData`
- Validação de CPF com regex

**Como testar:**
```bash
# Teste 1: Payload válido
curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": { "remoteJid": "5561999999999@s.whatsapp.net", "fromMe": false },
      "message": { "conversation": "Teste" },
      "pushName": "Cliente Teste"
    }
  }'

# Esperado: 200 OK, roteamento funciona

# Teste 2: Payload inválido (telefone errado)
curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": { "remoteJid": "abc@s.whatsapp.net", "fromMe": false },
      "message": { "conversation": "Teste" }
    }
  }'

# Esperado: 400 Bad Request com erro de validação
```

---

### ✅ Correção #2: Try/Catch Robusto

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts` (Linhas 692-755)

**O que foi feito:**
- Try/catch em 3 níveis: JSON parse, validação Zod, chamada ao routing-agent
- Mensagem de erro ao cliente quando falha
- Logs estruturados em todas as etapas

**Como testar:**
1. Simular routing-agent offline (desabilitar temporariamente)
2. Enviar mensagem via WhatsApp
3. Verificar se cliente recebe: "⚠️ Desculpe, estamos com dificuldades técnicas..."
4. Verificar logs em `monitoring_logs` com erro detalhado

---

### ✅ Correção #3: Verificação de .context.error

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts` (Linhas 734-738)

**O que foi feito:**
- Verificação dupla: `result.error` E `result.data.context.error`
- Log de warning quando erro está em context

**Como testar:**
```sql
-- Ver logs de erro
SELECT * FROM monitoring_logs 
WHERE agent_name = 'whatsapp-webhook' 
  AND level = 'error'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Deve conter:
-- "⚠️ Error detected in response context"
```

---

### ✅ Correção #4: Parse Seguro no Routing-Agent

**Arquivo:** `supabase/functions/routing-agent/index.ts` (Linhas 33-81)

**O que foi feito:**
- Try/catch no JSON parse
- Validação de campos obrigatórios com mensagens claras
- Normalização de `customerData` vs `context`

**Como testar:**
```bash
# Teste 1: JSON inválido
curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/routing-agent \
  -H "Content-Type: application/json" \
  -d 'invalid json'

# Esperado: 400 "Invalid JSON in request body"

# Teste 2: Campo obrigatório ausente
curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/routing-agent \
  -H "Content-Type: application/json" \
  -d '{"message": "teste"}'

# Esperado: 400 "conversationId é obrigatório"
```

---

### ✅ Correção #5: Logger Sanitização

**Arquivo:** `supabase/functions/_shared/structured-logger.ts` (Linhas 46-54)

**O que foi feito:**
- Função `sanitizeMetadata()` para serializar objetos complexos
- Fallback para erro quando serialização falha

**Como testar:**
```typescript
// Em qualquer edge function
const logger = createLogger('test-agent');

// Teste 1: Object complexo
logger.info('Test', { 
  requestId: { nested: { object: true } },
  date: new Date(),
  circular: someCircularRef
});

// Esperado: Log salvo sem erro, metadata sanitizada

// Verificar no DB:
SELECT metadata FROM monitoring_logs 
WHERE agent_name = 'test-agent' 
ORDER BY created_at DESC LIMIT 1;
```

---

## 📊 Métricas de Sucesso

| Métrica | Antes | Meta | Como Medir |
|---------|-------|------|------------|
| **Taxa de roteamento correto** | 85% | 100% | `SELECT COUNT(*) FROM conversations WHERE department IS NOT NULL` |
| **Erros silenciosos/dia** | 10 | 0 | `SELECT COUNT(*) FROM monitoring_logs WHERE level = 'error' AND created_at > NOW() - INTERVAL '1 day'` |
| **Logs quebrados/dia** | 5 | 0 | Verificar console de edge functions |
| **Tempo médio de debug** | 30min | 5min | Cronometrar próximo debug |

---

## 🚨 Cenários de Teste Críticos

### Cenário 1: Cliente envia mensagem com CPF válido
```
1. Cliente: "Meu CPF é 12345678901"
2. Webhook valida CPF ✅
3. Routing-agent recebe payload normalizado ✅
4. Roteamento correto para agente ✅
```

### Cenário 2: Routing-agent está offline
```
1. Cliente: "Olá"
2. Webhook tenta chamar routing-agent ❌
3. Catch captura erro ✅
4. Cliente recebe mensagem de erro ✅
5. Log completo salvo ✅
```

### Cenário 3: Payload malformado
```
1. Sistema externo envia JSON inválido
2. JSON parse falha
3. Retorna 400 com mensagem clara ✅
4. Log de erro detalhado ✅
```

### Cenário 4: Metadata complexa no log
```
1. Logger recebe object circular
2. Sanitização converte para JSON ✅
3. Log salvo sem erro ✅
```

---

## 🔍 Como Monitorar em Produção

### Dashboard de Logs
```sql
-- Erros nas últimas 24h
SELECT 
  agent_name,
  COUNT(*) as error_count,
  MAX(created_at) as last_error
FROM monitoring_logs 
WHERE level = 'error' 
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY agent_name
ORDER BY error_count DESC;

-- Taxa de sucesso por hora
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) FILTER (WHERE level = 'error') as errors,
  COUNT(*) FILTER (WHERE level = 'info') as success,
  ROUND(100.0 * COUNT(*) FILTER (WHERE level = 'info') / COUNT(*), 2) as success_rate
FROM monitoring_logs
WHERE agent_name IN ('whatsapp-webhook', 'routing-agent')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Alertas Sugeridos
```sql
-- Alerta: Taxa de erro > 5%
CREATE OR REPLACE FUNCTION check_error_rate()
RETURNS void AS $$
DECLARE
  error_rate NUMERIC;
BEGIN
  SELECT 
    100.0 * COUNT(*) FILTER (WHERE level = 'error') / COUNT(*)
  INTO error_rate
  FROM monitoring_logs
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  IF error_rate > 5 THEN
    -- Inserir alerta
    INSERT INTO system_alerts (alert_type, severity, message, metadata)
    VALUES (
      'high_error_rate',
      'critical',
      'Error rate exceeds 5%',
      jsonb_build_object('error_rate', error_rate)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## ✅ Checklist Final

- [x] Zod instalado e configurado
- [x] Validação de payload implementada
- [x] Try/catch robusto em todas as edge functions
- [x] Verificação de .context.error
- [x] Logger sanitiza metadata
- [x] Mensagens de erro claras para usuários
- [x] Logs estruturados em todos os pontos
- [x] Config.toml atualizado (já estava correto)
- [ ] Testes manuais executados
- [ ] Métricas de sucesso validadas
- [ ] Monitoramento configurado

---

**Próximo passo:** Executar testes manuais e validar métricas em ambiente de staging antes de deploy em produção.
