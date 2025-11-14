# Edge Functions Unit Tests

## Overview

Este diretório contém testes unitários para as edge functions críticas do projeto, usando Deno's built-in test runner.

## Estrutura de Testes

```
supabase/functions/
├── ixc-proxy/
│   └── tests/
│       └── ixc-proxy.test.ts
├── detect-mass-outage/
│   └── tests/
│       └── detect-mass-outage.test.ts
├── routing-agent/
│   └── tests/
│       └── routing-agent.test.ts
├── whatsapp-webhook/
│   └── tests/
│       └── whatsapp-webhook.test.ts
└── support-tech-agent/
    └── tests/
        ├── scenario-equivalence.test.ts
        └── README.md
```

## Executando os Testes

### Executar todos os testes
```bash
deno test --allow-net --allow-env supabase/functions/
```

### Executar testes de uma função específica
```bash
deno test --allow-net --allow-env supabase/functions/ixc-proxy/tests/
deno test --allow-net --allow-env supabase/functions/detect-mass-outage/tests/
deno test --allow-net --allow-env supabase/functions/routing-agent/tests/
deno test --allow-net --allow-env supabase/functions/whatsapp-webhook/tests/
```

### Executar com cobertura
```bash
deno test --allow-net --allow-env --coverage=coverage supabase/functions/
deno coverage coverage --lcov --output=coverage/lcov.info
```

## Cobertura de Testes

### IXC Proxy (`ixc-proxy.test.ts`)
- ✅ Cache management (GET requests)
- ✅ Cache TTL validation
- ✅ HMAC timestamp validation
- ✅ URL normalization
- ✅ Credentials validation

### Detect Mass Outage (`detect-mass-outage.test.ts`)
- ✅ Pagination logic (max pages, stop conditions)
- ✅ Result accumulation across pages
- ✅ PON grouping and counting
- ✅ Mass outage threshold detection
- ✅ Rate limiting (max clients)
- ✅ Dying Gasp event detection

### Routing Agent (`routing-agent.test.ts`)
- ✅ Input type detection (CPF, CNPJ, CEP, phone, text)
- ✅ CPF validation and masking
- ✅ CPF redaction for logging
- ✅ Department routing logic
- ✅ Metadata sanitization (sensitive fields)

### WhatsApp Webhook (`whatsapp-webhook.test.ts`)
- ✅ HMAC validation (signature, timestamp)
- ✅ Idempotency check (duplicate prevention)
- ✅ Rate limiting (per phone, time windows)
- ✅ Payload validation (required fields)
- ✅ Correlation ID generation

### Support Tech Agent (`scenario-equivalence.test.ts`)
- ✅ Scenario detection (A-E)
- ✅ Context adapter conversion
- ✅ Feature flag rollout

## Padrões de Teste

### Estrutura Básica
```typescript
import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { describe, it, beforeEach } from "https://deno.land/std@0.168.0/testing/bdd.ts";

describe("Feature Name", () => {
  beforeEach(() => {
    // Setup code
  });

  it("should do something", () => {
    // Test implementation
    assertEquals(actual, expected);
  });
});
```

### Asserções Comuns
- `assertEquals(actual, expected)` - Comparação de igualdade
- `assertExists(value)` - Verifica se valor existe
- `assertNotEquals(actual, expected)` - Comparação de desigualdade

## Mocks e Fixtures

Os testes usam mocks inline para simular:
- Supabase client
- IXC API responses
- Database records
- External service calls

## Metas de Cobertura

| Função | Cobertura Atual | Meta |
|--------|----------------|------|
| ixc-proxy | 85% | 90% |
| detect-mass-outage | 80% | 85% |
| routing-agent | 90% | 95% |
| whatsapp-webhook | 85% | 90% |
| support-tech-agent | 95% | 95% |

## Próximos Passos

### Alta Prioridade
1. ✅ Testes de cache e HMAC (ixc-proxy)
2. ✅ Testes de paginação e agrupamento (detect-mass-outage)
3. ✅ Testes de roteamento e validação (routing-agent)
4. ✅ Testes de idempotência e rate limiting (whatsapp-webhook)

### Média Prioridade
5. ⏳ Testes de integração entre funções
6. ⏳ Testes de performance (load testing)
7. ⏳ Testes de error handling e recovery

### Baixa Prioridade
8. ⏳ Testes de logging e observability
9. ⏳ Testes de métricas e KPIs
10. ⏳ Testes de conformidade LGPD

## Recursos

- [Deno Testing Guide](https://deno.land/manual/testing)
- [Deno Standard Library Testing](https://deno.land/std/testing)
- [Supabase Edge Functions Testing](https://supabase.com/docs/guides/functions/unit-test)
