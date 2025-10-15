# Integração Cloé Martins - IXC

## 📋 Visão Geral

Este documento descreve a integração entre o **Routing Agent (Cloé Martins)** e o **IXC Soft**, responsável por validar clientes, determinar status (bloqueado, offline, online) e rotear para o departamento correto.

## 🏗️ Arquitetura

```
WhatsApp → routing-agent/index.ts
              ↓
         helpers.ts (validação IXC)
              ↓
         ixc-integration (Edge Function)
              ↓
         ixc-proxy → IXC Soft API
```

### Componentes

1. **`routing-agent/index.ts`** - Orquestração do fluxo de roteamento
2. **`routing-agent/helpers.ts`** - Lógica de integração IXC e decisão de roteamento
3. **`ixc-integration`** - Edge Function com cache, circuit breaker e retry
4. **`ixc-proxy`** - Proxy seguro com HMAC para IXC API

## 🔄 Fluxo de Roteamento

### 1. Extração de CPF

```typescript
extractCPF(message: string): string | null
```

Aceita formatos:
- `123.456.789-10`
- `12345678910`
- `CPF: 123.456.789-10`

### 2. Busca no IXC

```typescript
getClientRoutingStatus(supabase, message): Promise<ClientRoutingStatus>
```

**Etapas:**
1. Extrai CPF da mensagem
2. Chama `ixc-integration` → `searchCustomers(cpf)`
3. Se encontrado, chama `getCustomerStatus(id)`
4. Verifica pane em massa (`massOutageContext`)
5. **Fallback:** Busca histórico local (`customer_contact_history`)

### 3. Determinação de Departamento

```typescript
determineTargetDepartment(clientStatus, messageContent): Department
```

**Lógica:**
- Cliente **não encontrado** → `comercial` (Vicente - prospects)
- Cliente **bloqueado** → `financeiro` (Julia)
- Cliente **offline** → `tecnico` (Luan)
- Cliente **online** + keywords financeiras → `financeiro`
- Cliente **online** + keywords técnicas → `tecnico`
- **Padrão** → `cloe` (continua atendimento)

### 4. Atualização de Conversa

- Salva **metadata sanitizado** (LGPD compliant)
- Registra em `customer_contact_history`
- Envia mensagem de transferência (se aplicável)
- Invoca agente especializado

## 🔒 Segurança e LGPD

### Sanitização de Metadata

```typescript
createSanitizedMetadata(protocol, clientStatus): SanitizedMetadata
```

**O que é salvo:**
```json
{
  "protocol": "PROT-1234567890-ABC123",
  "status": "ativo",
  "cpf_redacted": "***789",
  "source": "ixc"
}
```

**O que NÃO é salvo:**
- CPF completo
- Endereço
- CNPJ
- Login IXC
- Informações financeiras detalhadas

### Redação de CPF

```typescript
redactCPF("12345678910") → "***910"
```

## 🛡️ Resiliência

### 1. Fallback para Histórico Local

Se o IXC estiver indisponível:
```sql
SELECT * FROM customer_contact_history 
WHERE cpf = $1 
ORDER BY created_at DESC 
LIMIT 1
```

### 2. Integração com Mass Outage

```typescript
if (massOutageContext.active && isOffline) {
  isOffline = false; // Evita falso encaminhamento técnico
}
```

### 3. Validação Explícita de Respostas

```typescript
if (!searchResult?.success || !searchResult?.data) {
  // Fallback para histórico
}
```

## 📊 Códigos de Erro

```typescript
enum ErrorCode {
  NO_CPF = "NO_CPF",                    // CPF não identificado
  IXC_UNAVAILABLE = "IXC_UNAVAILABLE",  // IXC offline
  CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND", // Cliente não existe
  INVALID_RESPONSE = "INVALID_RESPONSE" // Resposta inválida
}
```

## 🎯 Palavras-chave de Roteamento

### Financeiro
```regex
/\b(boleto|fatura|pagamento|débito|mensalidade|pagar|pix)\b/i
```
**Contexto negativo:** `novo`, `ótimo`, `funcionando`

### Técnico
```regex
/\b(internet|lenta|conexão|sem sinal|travando|wifi|caiu|fora do ar)\b/i
```
**Contexto negativo:** `novo`, `ótimo`, `funcionando bem`

## 📝 Logs e Observabilidade

### Structured Logging

```typescript
const logger = createLogger("routing-agent", req);

logger.info("Routing Agent iniciado", { conversationId });
logger.warn("IXC indisponível, usando fallback");
logger.error("Erro crítico", { error: err.message });
```

### Métricas Coletadas

- Tempo de resposta IXC
- Taxa de fallback para histórico
- Taxa de roteamento por departamento
- Erros de validação CPF

## 🧪 Testes

### Cenários de Teste

1. **Cliente ativo online:**
   - CPF válido → Roteamento baseado em keywords
   
2. **Cliente bloqueado:**
   - Qualquer mensagem → `financeiro` (Julia)
   
3. **Cliente offline:**
   - Sem pane em massa → `tecnico` (Luan)
   - Com pane em massa → Continua com Cloé
   
4. **Cliente não encontrado:**
   - Sem histórico → `comercial` (Vicente)
   - Com histórico → Usa dados do histórico
   
5. **CPF não identificado:**
   - Cloé solicita CPF com protocolo

## 🔧 Configuração

### Variáveis de Ambiente

```env
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
IXC_API_BASE_URL=https://...
IXC_API_USERNAME=...
IXC_API_PASSWORD=...
```

### Ajustes de Comportamento

```typescript
// routing-agent/config.ts
export const ROUTING_AGENT_CONFIG = {
  massOutage: {
    enabled: true,
    skipCPFValidation: true,
  },
  rateLimit: {
    enabled: true,
    maxAttempts: 5,
  }
};
```

## 🚀 Próximos Passos

### Melhorias Futuras

1. **Classificação Semântica:**
   - Usar embeddings para intenção (além de regex)
   - Treinar modelo de classificação de departamento

2. **Cache Inteligente:**
   - Cache por CPF com TTL dinâmico
   - Invalidação baseada em webhooks IXC

3. **Analytics:**
   - Dashboard de roteamento em tempo real
   - Análise de precisão de classificação

4. **Expansão de Agentes:**
   - Julia (financeiro) - negociação de débitos
   - Vicente (comercial) - vendas e upgrades
   - Integração com CRM

## 📚 Referências

- [Fluxograma Cloé - Validação CPF v2](./fluxograma-cloe-validacao-cpf-v2.md)
- [IXC Integration API Reference](./atlas-analyzer-api-reference.md)
- [Tools Reference](./tools-reference.md)
- [Mass Outage Detection](./mass-outage-implementation-v1.1.0.md)

---

**Última atualização:** 2025-01-15  
**Versão:** 1.0.0  
**Autor:** Sistema de Documentação Automática
