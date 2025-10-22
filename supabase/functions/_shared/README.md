# 🛡️ Sistema de Proteção Unificado - Edge Functions

Este diretório contém **todos os helpers compartilhados** que fornecem proteção automática para Edge Functions.

## 📁 Arquivos Disponíveis

### 🎯 Base Handler (`base-handler.ts`)
Template principal para criar novas edge functions com proteção completa.

**Inclui automaticamente:**
- ✅ CORS (preflight + headers)
- ✅ Error handling padronizado
- ✅ Rate limiting por CPF
- ✅ Metrics automáticas
- ✅ Autenticação JWT
- ✅ Structured logging

### 🚨 Error Handler (`error-handler.ts`)
Trata erros de forma padronizada e registra no Supabase.

### 🚫 Rate Limiter (`rate-limiter.ts`)
Controle de taxa por CPF (10 req/min, block 5min).

### 📊 Metrics Helper (`metrics-helper.ts`)
Registra métricas automaticamente (duração, sucesso/erro).

### 🔐 Outros Helpers
- `circuit-breaker.ts` - Proteção contra cascata de falhas
- `ixc-client.ts` - Cliente IXC centralizado
- `cache-helper.ts` - Cache inteligente
- `hmac.ts` - Validação de assinaturas
- `validateAndMaskCPF.ts` - Validação e mascaramento de CPF
- `pii-redaction.ts` - Redação de dados sensíveis
- `lgpd-logger.ts` - Logs LGPD-compliant
- `structured-logger.ts` - Logging estruturado

## 🚀 Uso Rápido

### Para função pública (sem auth):
```typescript
import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'my-function-name',
  async (req, { supabase }) => {
    // Sua lógica aqui
    return { success: true };
  }
));
```

### Para função autenticada com rate limit:
```typescript
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

Deno.serve(createAuthenticatedHandler(
  'my-protected-function',
  async (req, { supabase, user, cpf }) => {
    // user já validado
    // cpf já extraído
    // rate limit já checado
    return { success: true };
  }
));
```

## 📖 Documentação Completa

Veja `TEMPLATE.md` para exemplos detalhados e casos de uso.

## 🎯 Benefícios

✅ **Segurança:** Proteção automática contra abuso
✅ **Observabilidade:** Métricas e logs padronizados
✅ **Manutenibilidade:** Código DRY, fácil de atualizar
✅ **Velocidade:** Crie novas funções em minutos
✅ **Consistência:** Todos usam o mesmo padrão

## ⚠️ Regras

1. **SEMPRE** usar `base-handler.ts` para novas funções
2. **NUNCA** reimplementar CORS/error handling manualmente
3. **SEMPRE** registrar no `supabase/config.toml`
4. **SEMPRE** documentar no README da função
