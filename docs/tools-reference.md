# 🔧 Ferramentas (Tools) - Referência Técnica

Este documento detalha todas as ferramentas compartilhadas disponíveis no sistema multiagente da SUPERNET FIBRA.

## 📁 Localização

Todas as ferramentas compartilhadas estão em:
```
/supabase/functions/_shared/
```

---

## 🛠️ Ferramentas Disponíveis

### 1. IXC Client (`ixc-client.ts`)

**Descrição:** Cliente para integração com a API do IXC Soft (sistema de gestão de provedores).

**Funcionalidades:**
- Buscar informações de clientes
- Consultar status de contratos
- Criar tickets de suporte
- Verificar pendências financeiras
- Acessar dados de equipamentos
- Consultar histórico de atendimentos

**Métodos Principais:**
- `getClient(cpf)` - Busca cliente por CPF
- `getClientStatus(clientId)` - Verifica status de conexão
- `createTicket(data)` - Cria ordem de serviço
- `getContracts(clientId)` - Lista contratos do cliente
- `getFinancialStatus(clientId)` - Consulta pendências

**Agentes que Utilizam:**
- `sales-agent` - Para verificar se cliente já existe
- `support-tech-agent` - Para troubleshooting e criar tickets
- `support-financial-agent` - Para verificar pendências e desbloquear
- `routing-agent` - Para identificar e rotear clientes

**Exemplo de Uso:**
```typescript
import { getClient, createTicket } from '../_shared/ixc-client.ts';

// Buscar cliente
const client = await getClient(cpf);

// Criar ticket
const ticket = await createTicket({
  id_cliente: client.id,
  tipo: 'manutencao',
  descricao: 'Equipamento sem sinal'
});
```

---

### 2. HMAC Authentication (`hmac.ts`)

**Descrição:** Autenticação segura entre Edge Functions usando HMAC (Hash-based Message Authentication Code).

**Funcionalidades:**
- Gerar assinaturas HMAC para requisições
- Validar assinaturas recebidas
- Proteção contra replay attacks com timestamp
- Garantir integridade das mensagens

**Métodos Principais:**
- `generateHMAC(data, timestamp)` - Gera assinatura
- `validateHMACWithTimestamp(signature, data, timestamp)` - Valida assinatura
- `isTimestampValid(timestamp, maxAge)` - Valida freshness da requisição

**Agentes que Utilizam:**
- Todos os agentes que fazem chamadas internas entre Edge Functions
- Comunicação com `ixc-proxy`
- Comunicação entre agentes

**Configuração:**
```typescript
// Secret compartilhado (variável de ambiente)
const HMAC_SHARED_SECRET = Deno.env.get('HMAC_SHARED_SECRET');

// Gerar HMAC para requisição
const timestamp = Date.now();
const signature = await generateHMAC(requestBody, timestamp);

// Headers da requisição
headers: {
  'X-HMAC-Signature': signature,
  'X-Timestamp': timestamp.toString()
}
```

**Segurança:**
- ✅ Protege contra interceptação de requisições
- ✅ Previne replay attacks (janela de 5 minutos)
- ✅ Valida integridade dos dados
- ⚠️ Secret deve ser rotacionado periodicamente

---

### 3. Rate Limiter (`rate-limiter.ts`)

**Descrição:** Controle de taxa de requisições para prevenir abuso e sobrecarga do sistema.

**Funcionalidades:**
- Limite de requisições por usuário/IP
- Janelas de tempo configuráveis
- Bloqueio temporário após exceder limites
- Tracking de tentativas

**Métodos Principais:**
- `checkRateLimit(identifier)` - Verifica se requisição é permitida
- `formatBlockedTime(blockedUntil)` - Formata tempo de bloqueio para usuário
- `resetLimit(identifier)` - Reseta contador (admin only)

**Configuração Padrão:**
```typescript
{
  maxRequests: 10,           // Máximo de requisições
  windowMinutes: 1,          // Janela de tempo (1 minuto)
  blockDurationMinutes: 15   // Tempo de bloqueio
}
```

**Agentes que Utilizam:**
- `routing-agent` - Limita consultas de CPF
- Todos os agentes públicos acessíveis por clientes

**Exemplo de Uso:**
```typescript
import { checkRateLimit, formatBlockedTime } from '../_shared/rate-limiter.ts';

const rateLimitCheck = await checkRateLimit(cpf);

if (!rateLimitCheck.allowed) {
  const message = rateLimitCheck.blockedUntil
    ? `Aguarde ${formatBlockedTime(rateLimitCheck.blockedUntil)}`
    : 'Muitas tentativas';
  
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: corsHeaders
  });
}
```

**Boas Práticas:**
- ✅ Sempre aplicar em endpoints públicos
- ✅ Usar identificadores únicos (CPF, IP, user_id)
- ✅ Logar tentativas bloqueadas para análise
- ⚠️ Ajustar limites conforme volume real de uso

---

### 4. Metrics Helper (`metrics-helper.ts`)

**Descrição:** Coleta e registro de métricas de performance e uso do sistema.

**Funcionalidades:**
- Registro de latência de requisições
- Tracking de uso de ferramentas
- Métricas de sucesso/falha
- Agregação de dados para dashboards

**Métodos Principais:**
- `recordMetric(type, data)` - Registra métrica
- `trackAgentPerformance(agent, duration)` - Performance de agentes
- `trackToolUsage(tool, success)` - Uso de ferramentas

**Métricas Coletadas:**
```typescript
{
  agent_name: string,        // Nome do agente
  action_type: string,       // Tipo de ação executada
  duration_ms: number,       // Tempo de execução
  success: boolean,          // Sucesso ou falha
  error_message?: string,    // Mensagem de erro (se houver)
  metadata: object          // Dados adicionais
}
```

**Agentes que Utilizam:**
- Todos os agentes para tracking de performance
- `metrics-collector` Edge Function para agregação

**Exemplo de Uso:**
```typescript
import { recordMetric, trackAgentPerformance } from '../_shared/metrics-helper.ts';

const startTime = Date.now();

try {
  // ... lógica do agente
  
  const duration = Date.now() - startTime;
  await trackAgentPerformance('sales-agent', duration, true);
  
} catch (error) {
  await recordMetric('error', {
    agent: 'sales-agent',
    error: error.message
  });
}
```

---

### 5. Types (`types.ts`)

**Descrição:** Definições de tipos TypeScript compartilhadas entre todos os agentes.

**Tipos Principais:**

```typescript
// Payload de roteamento entre agentes
interface RoutingPayload {
  conversationId: string;
  customerData?: CustomerData;
  routeReason?: string;
  message: string;
}

// Dados do cliente
interface CustomerData {
  customer_cpf: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  ixc_client_id?: string;
  metadata?: object;
}

// Mensagem de conversa
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Configuração de agente
interface AgentConfig {
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  capabilities?: string[];
}
```

**Uso:**
```typescript
import { RoutingPayload, CustomerData } from '../_shared/types.ts';
```

---

## 📊 Matriz de Dependências

| Ferramenta | Crítica? | Dependências | Testes |
|------------|----------|--------------|--------|
| IXC Client | ✅ Sim | `HMAC`, `Rate Limiter` | ✅ Sim |
| HMAC | ✅ Sim | Nenhuma | ✅ Sim |
| Rate Limiter | ⚠️ Recomendada | Supabase | ✅ Sim |
| Metrics Helper | ❌ Opcional | Supabase | ⚠️ Parcial |
| Types | ✅ Sim | Nenhuma | N/A |

---

## 🔒 Segurança

### Secrets Necessários

```bash
# IXC Integration
IXC_API_BASE_URL=https://provedor.ixcsoft.com.br
IXC_API_USERNAME=seu_usuario
IXC_API_PASSWORD=sua_senha

# HMAC Authentication
HMAC_SHARED_SECRET=chave-secreta-32-chars-min

# Supabase
SUPABASE_URL=https://projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service
```

### Boas Práticas

1. **Nunca logar secrets** em console.log
2. **Validar inputs** antes de passar para ferramentas
3. **Usar HMAC** para chamadas internas críticas
4. **Rate limit** em todos endpoints públicos
5. **Coletar métricas** para detecção de anomalias

---

## 🚀 Como Adicionar Nova Ferramenta

1. **Criar arquivo em `_shared/`:**
```typescript
// /supabase/functions/_shared/minha-ferramenta.ts
export const minhaFuncao = async (params) => {
  // implementação
};
```

2. **Adicionar tipos em `types.ts`:**
```typescript
export interface MinhaFerramentaParams {
  // ...
}
```

3. **Documentar aqui neste arquivo**

4. **Atualizar `agent-tools-matrix.md`**

5. **Criar testes**

---

## 📚 Recursos Adicionais

- [Documentação IXC Soft](https://wikiapiprovedor.ixcsoft.com.br/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [HMAC Best Practices](https://www.rfc-editor.org/rfc/rfc2104)

---

**Última atualização:** Outubro 2025
