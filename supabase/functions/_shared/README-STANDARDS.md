# Padrões de Código - Sprints 2, 3 e 4

## Sprint 2: Logger Estruturado

### Uso do Logger

```typescript
import { createLogger } from '../_shared/logger.ts';

const logger = createLogger('function-name');

// Níveis de log
logger.debug('Debug info', { detail: 'value' });
logger.info('Operation started', { userId: '123' });
logger.warn('Potential issue', { attempts: 3 });
logger.error('Operation failed', { error: err });
logger.critical('System failure', { service: 'IXC' });

// Timing
const endTimer = logger.time('database-query');
// ... operação
endTimer(); // Loga duração automaticamente

// Child logger com contexto adicional
const childLogger = logger.child({ userId: '123' });
```

### Níveis de Log

- **debug**: Informações detalhadas para debugging (não persiste)
- **info**: Informações gerais (não persiste)
- **warn**: Avisos que requerem atenção (persiste)
- **error**: Erros recuperáveis (persiste)
- **critical**: Erros críticos que afetam o sistema (persiste)

### Migração de console.log

❌ **Antes:**
```typescript
console.log('Cliente encontrado:', customer);
console.error('Erro ao buscar:', error);
```

✅ **Depois:**
```typescript
logger.info('Cliente encontrado', { customerId: customer.id });
logger.error('Erro ao buscar', { error, context: 'customer-search' });
```

## Sprint 3: Nomenclaturas Padronizadas

### Convenções

1. **Edge Functions**: `kebab-case`
   - ✅ `support-tech-agent`
   - ❌ `supportTechAgent`, `support_tech_agent`

2. **Tipos/Interfaces**: `PascalCase`
   - ✅ `IXCCustomer`, `EdgeFunctionError`
   - ❌ `ixcCustomer`, `IIXCCustomer` (sem prefixo I)

3. **Variáveis/Funções**: `camelCase`
   - ✅ `customerData`, `getUserById`
   - ❌ `customer_data`, `GetUserById`

4. **Constantes**: `UPPER_SNAKE_CASE`
   - ✅ `MAX_RETRIES`, `API_BASE_URL`
   - ❌ `maxRetries`, `apiBaseUrl`

5. **Arquivos**: `kebab-case.ts`
   - ✅ `error-types.ts`, `ixc-client.ts`
   - ❌ `errorTypes.ts`, `ixc_client.ts`

### Utilitários de Conversão

```typescript
import { snakeToCamel, camelToSnake, objectToCamelCase } from '../_shared/naming-conventions.ts';

// Converter strings
snakeToCamel('user_name'); // 'userName'
camelToSnake('userName'); // 'user_name'

// Converter objetos (útil para API IXC)
const ixcData = { cliente_id: '123', nome_completo: 'João' };
const jsData = objectToCamelCase(ixcData);
// { clienteId: '123', nomeCompleto: 'João' }
```

## Sprint 4: ESLint Rules

### Regras Ativas

1. **No Console**: Use logger em vez de console.log
2. **No Any**: Evite `any`, use tipos específicos ou `unknown`
3. **No Unused Vars**: Variáveis não usadas geram warning
4. **Prefer Const**: Use `const` quando possível
5. **Strict Equality**: Use `===` em vez de `==`
6. **Type Imports**: Use `import type` para tipos

### Exemplos

❌ **Erros Comuns:**
```typescript
let data: any = getData();              // no-explicit-any
var x = 10;                             // no-var
if (value == null) { }                  // eqeqeq
import { Type } from './types';         // prefer type import
```

✅ **Correto:**
```typescript
const data: UserData = getData();       // tipo específico
const x = 10;                           // const
if (value === null) { }                 // strict equality
import type { Type } from './types';    // type import
```

### Supressão de Warnings

Use apenas quando necessário:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function legacyFunction(data: any) {
  // código legado
}
```

## Checklist de PR

- [ ] Não há `console.log` no código (usar logger)
- [ ] Não há tipos `any` (usar tipos específicos)
- [ ] Nomenclaturas seguem as convenções
- [ ] ESLint não reporta erros críticos
- [ ] Logs críticos são persistidos corretamente
- [ ] PII é redactado antes de logging

## Arquivos de Referência

- **Logger**: `supabase/functions/_shared/logger.ts`
- **Naming**: `supabase/functions/_shared/naming-conventions.ts`
- **Error Types**: `supabase/functions/_shared/error-types.ts`
- **ESLint Config**: `eslint.config.js`
