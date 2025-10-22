# 🛡️ Template para Novas Edge Functions

Este documento descreve como criar novas Edge Functions com proteção automática (CORS, error handling, rate limiting, metrics).

## 📋 Padrões Disponíveis

### 1. Função Pública (sem autenticação)

```typescript
import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'my-public-function',
  async (req, { supabase }) => {
    const body = await req.json();
    
    // Sua lógica aqui
    const result = await supabase
      .from('table')
      .select('*');
    
    return {
      success: true,
      data: result.data
    };
  }
));
```

### 2. Função Autenticada com Rate Limit

```typescript
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

Deno.serve(createAuthenticatedHandler(
  'my-protected-function',
  async (req, { supabase, user, cpf }) => {
    const body = await req.json();
    
    // user já está validado
    // cpf já foi extraído e rate limit checado
    
    const result = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', user.id);
    
    return {
      success: true,
      user: user.email,
      data: result.data
    };
  }
));
```

### 3. Função Customizada (controle total)

```typescript
import { createProtectedHandler } from "../_shared/base-handler.ts";

Deno.serve(createProtectedHandler({
  functionName: 'my-custom-function',
  requireAuth: true,
  enableRateLimit: true,
  
  // Extrator customizado de CPF
  extractCpf: async (req, user) => {
    const body = await req.clone().json();
    return body.customer?.document || body.cpf;
  },
  
  // Handler principal
  handler: async (req, { supabase, user, cpf }) => {
    // Lógica customizada
    return { success: true };
  }
}));
```

## ✅ O que já vem incluso

Todas as funções criadas com esses templates **automaticamente** têm:

- ✅ **CORS** habilitado (preflight + headers)
- ✅ **Error handling** padronizado com logs no Supabase
- ✅ **Rate limiting** por CPF (10 req/min, block 5min)
- ✅ **Metrics** automáticas (duração, sucesso/erro)
- ✅ **Structured logging** com contexto
- ✅ **Autenticação JWT** (quando `requireAuth: true`)

## 📊 Métricas Registradas

Cada requisição gera automaticamente:

```sql
INSERT INTO agent_metrics (
  agent_name,
  action_type,
  success,
  duration_ms,
  error_message
)
```

## 🚫 Rate Limiting

Quando habilitado (`enableRateLimit: true`):

- **Limite:** 10 requisições por minuto por CPF
- **Bloqueio:** 5 minutos após exceder
- **Resposta:** HTTP 429 com tempo de desbloqueio

## 🔐 Autenticação

Quando habilitado (`requireAuth: true`):

- Valida JWT token do header `Authorization: Bearer <token>`
- Retorna HTTP 401 se inválido/ausente
- Popula `context.user` com dados do usuário

## 📝 Exemplos Reais

### Webhook sem autenticação

```typescript
import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'whatsapp-webhook',
  async (req, { supabase }) => {
    const event = await req.json();
    
    await supabase.from('webhook_events').insert(event);
    
    return { received: true };
  }
));
```

### API de usuário autenticado

```typescript
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

Deno.serve(createAuthenticatedHandler(
  'get-user-profile',
  async (req, { supabase, user }) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    return { profile: data };
  }
));
```

## 🎯 Quando usar cada padrão

| Padrão | Usa quando |
|--------|-----------|
| `createPublicHandler` | Webhooks, endpoints públicos, health checks |
| `createAuthenticatedHandler` | APIs de usuário, dados protegidos, ações sensíveis |
| `createProtectedHandler` | Casos customizados, lógica complexa de auth/rate-limit |

## ⚠️ Importante

- **Sempre** usar um desses templates para novas funções
- **Nunca** reimplementar CORS/error handling manualmente
- **Sempre** registrar a função no `supabase/config.toml`

## 📚 Referências

- Error Handler: `_shared/error-handler.ts`
- Rate Limiter: `_shared/rate-limiter.ts`
- Metrics: `_shared/metrics-helper.ts`
- Base Handler: `_shared/base-handler.ts`
