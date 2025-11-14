# 🛡️ Rate Limiting - Guia de Uso

## Quick Start

### 1. Endpoint Público COM Rate Limiting

```typescript
import { createPublicHandlerWithRateLimit } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandlerWithRateLimit(
  'my-public-api',
  async (req, { supabase }) => {
    // Sua lógica aqui
    return { success: true, data: {} };
  }
));
```

**Limites padrão**: 10 req/min por IP (strict)

### 2. Endpoint Público SEM Rate Limiting

```typescript
import { createPublicHandler } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandler(
  'my-public-api',
  async (req, { supabase }) => {
    return { success: true };
  }
));
```

⚠️ **Use apenas para endpoints não-críticos**

### 3. Endpoint Autenticado COM Rate Limiting

```typescript
import { createAuthenticatedHandler } from '../_shared/base-handler.ts';

Deno.serve(createAuthenticatedHandler(
  'my-auth-api',
  async (req, { supabase, user }) => {
    // user.id disponível aqui
    return { success: true, userId: user.id };
  }
));
```

**Limites**: 10 req/min por CPF + autenticação obrigatória

### 4. Configuração Customizada

```typescript
import { createPublicHandlerWithRateLimit } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandlerWithRateLimit(
  'my-api',
  async (req, { supabase }) => {
    return { success: true };
  },
  {
    maxRequestsPerMinute: 30,  // Customizar limite
    windowMs: 60000            // 1 minuto
  }
));
```

## Presets Disponíveis

Use quando precisar de mais controle:

```typescript
import { RateLimiters } from '../_shared/rate-limiter-ip.ts';

// No início do handler
await RateLimiters.strict.check(req);    // 10/min - Sensível
await RateLimiters.moderate.check(req);  // 30/min - Padrão
await RateLimiters.lenient.check(req);   // 100/min - Alta tráfego
await RateLimiters.publicAPI.check(req); // 5/min - Público
```

## Quando Usar Cada Tipo?

### ✅ `createPublicHandlerWithRateLimit`
- ✅ Login/autenticação
- ✅ Recuperação de senha
- ✅ Formulários públicos
- ✅ APIs de consulta pública

### ✅ `createPublicHandler` (SEM rate limit)
- ⚠️ Webhooks com HMAC
- ⚠️ Health checks
- ⚠️ Endpoints que já têm idempotência

### ✅ `createAuthenticatedHandler`
- ✅ Operações CRUD autenticadas
- ✅ APIs que modificam dados
- ✅ Endpoints de proxy (ex: ixc-proxy)
- ✅ Operações sensíveis

## Troubleshooting

### Error: "Rate limit exceeded"

**Status**: 429 Too Many Requests

**Resposta**:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 42,
  "limit": 10
}
```

**Solução para usuário**: Aguardar `retryAfter` segundos

**Solução para dev**: 
- Verificar se limite é adequado
- Considerar aumentar limite para esse endpoint
- Verificar se há loop infinito no cliente

### Headers de Debug

Sempre disponíveis nas respostas:
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 2025-11-14T13:45:00Z
Retry-After: 42  (apenas quando 429)
```

## Exemplos Práticos

### Exemplo 1: Login com Rate Limiting

```typescript
// telemedicina-auth/index.ts
import { createPublicHandlerWithRateLimit } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandlerWithRateLimit(
  'telemedicina-auth',
  async (req, { supabase }) => {
    const { cpf, password } = await req.json();
    
    // Validação
    if (!cpf || !password) {
      throw new Error('CPF e senha são obrigatórios');
    }
    
    // Autenticar...
    return { 
      success: true,
      token: 'jwt-token' 
    };
  }
  // Usa limites padrão: 10 req/min
));
```

### Exemplo 2: API Pública com Limite Alto

```typescript
import { createPublicHandlerWithRateLimit } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandlerWithRateLimit(
  'public-stats',
  async (req, { supabase }) => {
    const { data } = await supabase
      .from('public_stats')
      .select('*');
    
    return { stats: data };
  },
  {
    maxRequestsPerMinute: 100,  // Alta tráfego
    windowMs: 60000
  }
));
```

### Exemplo 3: Webhook com HMAC (SEM Rate Limit)

```typescript
import { createPublicHandler } from '../_shared/base-handler.ts';
import { validateHMACRequest } from '../_shared/hmac.ts';

Deno.serve(createPublicHandler(
  'external-webhook',
  async (req, { supabase }) => {
    // HMAC é a proteção aqui
    const hmacSecret = Deno.env.get('HMAC_SHARED_SECRET');
    const validation = await validateHMACRequest(req, hmacSecret);
    
    if (!validation.valid) {
      throw new Error('Invalid HMAC signature');
    }
    
    // Processar webhook...
    return { success: true };
  }
));
```

## Boas Práticas

### ✅ DO
- ✅ Use rate limiting em TODOS os endpoints públicos de autenticação
- ✅ Use rate limiting em APIs que consomem recursos externos
- ✅ Teste limites com carga real antes de produção
- ✅ Monitore métricas de rate limiting
- ✅ Retorne mensagens amigáveis ao usuário

### ❌ DON'T
- ❌ Não use rate limiting em health checks
- ❌ Não configure limites muito baixos (causar falsos positivos)
- ❌ Não ignore headers de rate limit no cliente
- ❌ Não use rate limiting como única proteção (combine com HMAC, auth, etc)

## Monitoramento

### Logs Estruturados

```typescript
// Automaticamente logado quando rate limit é excedido
logger.warn('🚫 Rate limit exceeded', {
  ip: 'xxx.xxx.xxx.xxx',
  endpoint: 'telemedicina-auth',
  count: 11,
  max: 10,
  trace_id: 'abc-123'
});
```

### Métricas

Buscar no banco:
```sql
SELECT * FROM metrics
WHERE metric_name = 'rate_limit_exceeded'
ORDER BY created_at DESC
LIMIT 100;
```

### Query de Auditoria

```sql
-- IPs que mais excederam rate limits (últimas 24h)
SELECT 
  dimensions->>'ip' as ip,
  COUNT(*) as violations,
  dimensions->>'endpoint' as endpoint
FROM metrics
WHERE metric_name = 'rate_limit_exceeded'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY dimensions->>'ip', dimensions->>'endpoint'
ORDER BY violations DESC
LIMIT 20;
```

## Perguntas Frequentes

### Q: Posso ter rate limits diferentes por usuário?
**A**: Sim! Use `createProtectedHandler` com `extractCpf` customizado:
```typescript
createProtectedHandler({
  functionName: 'my-api',
  enableRateLimit: true,
  extractCpf: async (req, user) => {
    // Extrair identificador único (CPF, user_id, API key, etc)
    return user?.id || req.headers.get('x-api-key');
  },
  handler: async (req, context) => { }
});
```

### Q: Rate limit reseta ao fazer deploy?
**A**: 
- **Por IP**: Sim (in-memory)
- **Por CPF**: Não (persistente no DB)

### Q: Como testar rate limiting localmente?
**A**: Use ferramenta como `ab` (Apache Bench):
```bash
ab -n 20 -c 5 http://localhost:54321/functions/v1/my-api
```

### Q: Rate limiting funciona com Cloudflare?
**A**: Sim! Detecta automaticamente `cf-connecting-ip` header.

## Recursos Adicionais

- 📖 [Documentação Completa](./ACT-006-RATE-LIMITING-COMPLETED.md)
- 🧪 [Scripts de Teste](../../scripts/test-rate-limiting.sh)
- 📊 [Dashboard de Métricas](https://supabase.com/dashboard/project/PROJECT_ID/functions)

---

**Dúvidas?** Consulte a equipe de segurança ou abra uma issue.
